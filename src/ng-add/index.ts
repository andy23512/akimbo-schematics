import {
  Rule,
  Tree,
  SchematicContext,
  SchematicsException
} from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/config';
import {
  getProjectFromWorkspace,
  addModuleImportToRootModule
} from '@angular/cdk/schematics';
import { Schema } from './schema';

export default function(options: Schema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(tree);
    const project = getProjectFromWorkspace(workspace, options.project);
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
    return tree;
  };
}
