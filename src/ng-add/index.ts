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
import { addProviderToModule } from '@schematics/angular/utility/ast-utils';

function readIntoSourceFile(host: Tree, fileName: string): SourceFile {
  const buffer = host.read(fileName);
  if (buffer === null) {
    throw new SchematicsException(`File ${fileName} does not exist.`);
  }

  return ts.createSourceFile(
    fileName,
    buffer.toString('utf-8'),
    ts.ScriptTarget.Latest,
    true
  );
}

export default function(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(tree);
    const project = getProjectFromWorkspace(workspace, options.project);
    const appModulePath = getAppModulePath(tree, getProjectMainFile(project));
    const sourceFile = readIntoSourceFile(tree, appModulePath);
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
    context.logger.info('✅️ Import HttpClientModule into root module');
    const change = insertImport(
      sourceFile as any,
      appModulePath,
      'HttpClient',
      '@angular/common/http'
    ) as InsertChange;

    const recorder = tree.beginUpdate(appModulePath);
    recorder.insertLeft(change.pos, change.toAdd);

    // 先抓到所有的 ImportDeclaration
    const allImports = sourceFile.statements.filter(node =>
      ts.isImportDeclaration(node)
    )! as ts.ImportDeclaration[];

    // 找到最後一個 ImportDeclaration
    let lastImport: ts.Node | undefined;
    for (const importNode of allImports) {
      if (!lastImport || importNode.getStart() > lastImport.getStart()) {
        lastImport = importNode;
      }
    }

    // 準備好要插入的程式碼
    const importStr = `\nexport function getAuthSettings(http: HttpClient) {
return () =>
  http
    .get('/api/get_csrf')
    .toPromise();
}
`;

    // 在最後一個 ImportDeclaration 結束的位置插入程式碼
    recorder.insertLeft(lastImport!.end, importStr);

    tree.commitUpdate(recorder);

    addProviderToModule(
      sourceFile,
      appModulePath,
      `{
      provide: APP_INITIALIZER,
      useFactory: getAuthSettings,
      multi: true,
      deps: [HttpClient],
    }`,
      '@angular/core'
    );

    return tree;
  };
}
