import {
  Rule,
  Tree,
  SchematicContext,
  SchematicsException
} from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/config';
import {
  getProjectFromWorkspace,
  addModuleImportToRootModule,
  getAppModulePath,
  getProjectMainFile,
  insertImport
} from '@angular/cdk/schematics';
import { Schema } from './schema';
import { InsertChange } from '@schematics/angular/utility/change';
import { SourceFile } from 'typescript';
import * as ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

function readIntoSourceFile(host: Tree, fileName: string): SourceFile {
  const buffer = host.read(fileName);
  if (buffer === null) {
    throw new SchematicsException(`File ${fileName} does not exist.`);
  }

  return tsquery.ast(buffer.toString('utf-8'));
}

export default function(options: Schema): Rule {
  return (tree: Tree, _: SchematicContext) => {
    const workspace = getWorkspace(tree);
    const project = getProjectFromWorkspace(workspace, options.project);
    const appModulePath = getAppModulePath(tree, getProjectMainFile(project));
    const sourceFile = readIntoSourceFile(tree, appModulePath);
    const recorder = tree.beginUpdate(appModulePath);

    const providersArray = tsquery(
      sourceFile,
      'Identifier[name=providers] ~ ArrayLiteralExpression',
      { visitAllChildren: true }
    );

    recorder.insertLeft(
      providersArray[0].getStart() + 1,
      `
    {
      provide: APP_INITIALIZER,
      useFactory: getCsrf,
      multi: true,
      deps: [HttpClient],
    },
  `
    );

    const importHttpClientChange = insertImport(
      sourceFile as any,
      appModulePath,
      'HttpClient',
      '@angular/common/http'
    ) as InsertChange;
    recorder.insertLeft(
      importHttpClientChange.pos,
      importHttpClientChange.toAdd
    );

    const importAppInitializerChange = insertImport(
      sourceFile as any,
      appModulePath,
      'APP_INITIALIZER',
      '@angular/core'
    ) as InsertChange;
    recorder.insertLeft(
      importAppInitializerChange.pos,
      importAppInitializerChange.toAdd
    );

    // 先抓到所有的 ImportDeclaration
    const allImports = tsquery(sourceFile, 'ImportDeclaration');

    // 找到最後一個 ImportDeclaration
    let lastImport: ts.Node | undefined;
    for (const importNode of allImports) {
      if (!lastImport || importNode.getStart() > lastImport.getStart()) {
        lastImport = importNode;
      }
    }

    // 準備好要插入的程式碼
    const importStr = `\n\nexport function getCsrf(http: HttpClient) {
  return () =>
    http
      .get('/api/get_csrf')
      .toPromise();
}`;

    // 在最後一個 ImportDeclaration 結束的位置插入程式碼
    recorder.insertLeft(lastImport!.end, importStr);

    tree.commitUpdate(recorder);

    addModuleImportToRootModule(
      tree,
      'HttpClientModule',
      '@angular/common/http',
      project
    );
    addModuleImportToRootModule(
      tree,
      `HttpClientXsrfModule.withOptions({cookieName: '${options.akimboProjectName}-csrf', headerName: 'X-CSRFToken'})`,
      '@angular/common/http',
      project
    );

    return tree;
  };
}
