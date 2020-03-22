"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const config_1 = require("@schematics/angular/utility/config");
const schematics_2 = require("@angular/cdk/schematics");
const ts = require("typescript");
const ast_utils_1 = require("@schematics/angular/utility/ast-utils");
function readIntoSourceFile(host, fileName) {
    const buffer = host.read(fileName);
    if (buffer === null) {
        throw new schematics_1.SchematicsException(`File ${fileName} does not exist.`);
    }
    return ts.createSourceFile(fileName, buffer.toString('utf-8'), ts.ScriptTarget.Latest, true);
}
function default_1(options) {
    return (tree, context) => {
        const workspace = config_1.getWorkspace(tree);
        const project = schematics_2.getProjectFromWorkspace(workspace, options.project);
        const appModulePath = schematics_2.getAppModulePath(tree, schematics_2.getProjectMainFile(project));
        const sourceFile = readIntoSourceFile(tree, appModulePath);
        schematics_2.addModuleImportToRootModule(tree, 'HttpClientModule', '@angular/common/http', project);
        schematics_2.addModuleImportToRootModule(tree, `HttpClientXsrfModule.withOptions({cookieName: '${options.akimboProjectName}-csrf', headerName: 'X-CSRFToken'})`, '@angular/common/http', project);
        context.logger.info('✅️ Import HttpClientModule into root module');
        const change = schematics_2.insertImport(sourceFile, appModulePath, 'HttpClient', '@angular/common/http');
        const recorder = tree.beginUpdate(appModulePath);
        recorder.insertLeft(change.pos, change.toAdd);
        // 先抓到所有的 ImportDeclaration
        const allImports = sourceFile.statements.filter(node => ts.isImportDeclaration(node));
        // 找到最後一個 ImportDeclaration
        let lastImport;
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
        recorder.insertLeft(lastImport.end, importStr);
        tree.commitUpdate(recorder);
        ast_utils_1.addProviderToModule(sourceFile, appModulePath, `{
      provide: APP_INITIALIZER,
      useFactory: getAuthSettings,
      multi: true,
      deps: [HttpClient],
    }`, '@angular/core');
        return tree;
    };
}
exports.default = default_1;
//# sourceMappingURL=index.js.map