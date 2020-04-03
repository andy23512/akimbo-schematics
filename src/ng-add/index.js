"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const config_1 = require("@schematics/angular/utility/config");
const schematics_2 = require("@angular/cdk/schematics");
const tsquery_1 = require("@phenomnomnominal/tsquery");
function readIntoSourceFile(host, fileName) {
    const buffer = host.read(fileName);
    if (buffer === null) {
        throw new schematics_1.SchematicsException(`File ${fileName} does not exist.`);
    }
    return tsquery_1.tsquery.ast(buffer.toString('utf-8'));
}
function default_1(options) {
    return (tree, _) => {
        const workspace = config_1.getWorkspace(tree);
        const project = schematics_2.getProjectFromWorkspace(workspace, options.project);
        const appModulePath = schematics_2.getAppModulePath(tree, schematics_2.getProjectMainFile(project));
        const sourceFile = readIntoSourceFile(tree, appModulePath);
        const recorder = tree.beginUpdate(appModulePath);
        const providersArray = tsquery_1.tsquery(sourceFile, 'Identifier[name=providers] ~ ArrayLiteralExpression', { visitAllChildren: true });
        recorder.insertLeft(providersArray[0].getStart() + 1, `
    {
      provide: APP_INITIALIZER,
      useFactory: getCsrf,
      multi: true,
      deps: [HttpClient],
    },
  `);
        const importHttpClientChange = schematics_2.insertImport(sourceFile, appModulePath, 'HttpClient', '@angular/common/http');
        recorder.insertLeft(importHttpClientChange.pos, importHttpClientChange.toAdd);
        const importAppInitializerChange = schematics_2.insertImport(sourceFile, appModulePath, 'APP_INITIALIZER', '@angular/core');
        recorder.insertLeft(importAppInitializerChange.pos, importAppInitializerChange.toAdd);
        // 先抓到所有的 ImportDeclaration
        const allImports = tsquery_1.tsquery(sourceFile, 'ImportDeclaration');
        // 找到最後一個 ImportDeclaration
        let lastImport;
        for (const importNode of allImports) {
            if (!lastImport || importNode.getStart() > lastImport.getStart()) {
                lastImport = importNode;
            }
        }
        // 準備好要插入的程式碼
        const importStr = `\n\nexport function getCsrf(http: HttpClient) {
  return () => http.get('/api/csrf').toPromise();
}`;
        // 在最後一個 ImportDeclaration 結束的位置插入程式碼
        recorder.insertLeft(lastImport.end, importStr);
        tree.commitUpdate(recorder);
        schematics_2.addModuleImportToRootModule(tree, 'HttpClientModule', '@angular/common/http', project);
        schematics_2.addModuleImportToRootModule(tree, `HttpClientXsrfModule.withOptions({cookieName: '${options.akimboProjectName}-csrf', headerName: 'X-CSRFToken'})`, '@angular/common/http', project);
        return tree;
    };
}
exports.default = default_1;
//# sourceMappingURL=index.js.map