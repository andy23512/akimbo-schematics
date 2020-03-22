"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@schematics/angular/utility/config");
const schematics_1 = require("@angular/cdk/schematics");
function default_1(options) {
    return (tree, context) => {
        const workspace = config_1.getWorkspace(tree);
        const project = schematics_1.getProjectFromWorkspace(workspace, options.project);
        schematics_1.addModuleImportToRootModule(tree, 'HttpClientModule', '@angular/common/http', project);
        schematics_1.addModuleImportToRootModule(tree, `HttpClientXsrfModule.withOptions({cookieName: '${options.akimboProjectName}-csrf', headerName: 'X-CSRFToken'})`, '@angular/common/http', project);
        context.logger.info('✅️ Import HttpClientModule into root module');
        return tree;
    };
}
exports.default = default_1;
//# sourceMappingURL=index.js.map