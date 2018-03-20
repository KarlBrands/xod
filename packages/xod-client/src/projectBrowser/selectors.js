import * as R from 'ramda';
import { Either } from 'ramda-fantasy';
import { createSelector } from 'reselect';

import * as XP from 'xod-project';

import { createMemoizedSelector } from '../utils/selectorTools';
import * as ProjectSelectors from '../project/selectors';
import { isPatchDeadTerminal } from '../project/utils';

export const getProjectBrowser = R.prop('projectBrowser');

export const shouldShowDeprecatedPatches = createSelector(
  getProjectBrowser,
  R.path(['filters', 'deprecated'])
);

export const getSelectedPatchPath = createSelector(
  getProjectBrowser,
  R.prop('selectedPatchPath')
);

export const getProjectName = createSelector(
  ProjectSelectors.getProject,
  R.compose(R.when(R.isEmpty, R.always('My Project')), XP.getProjectName)
);

// :: Project -> Patch -> Patch
const markDeadPatches = R.curry((project, patch) =>
  R.compose(
    R.assoc('dead', R.__, patch),
    Either.isLeft,
    XP.validatePatchContents
  )(patch, project)
);

// :: Patch -> Patch
const markDeprecatedPatches = patch =>
  R.assoc('deprecated', XP.isDeprecatedPatch(patch), patch);

export const getLocalPatches = createSelector(
  ProjectSelectors.getProject,
  project =>
    R.compose(
      R.sortBy(XP.getPatchPath),
      R.map(R.compose(markDeprecatedPatches, markDeadPatches(project))),
      XP.listLocalPatches
    )(project)
);

// TODO: this is not actually label anymore
export const getSelectedPatchLabel = createSelector(
  [ProjectSelectors.getProject, getSelectedPatchPath],
  (project, selectedPatchPath) =>
    selectedPatchPath
      ? XP.getPatchByPath(selectedPatchPath, project)
          .map(R.pipe(XP.getPatchPath, XP.getBaseName))
          .getOrElse('')
      : ''
);

const getLibraryPatchesList = createSelector(
  ProjectSelectors.getProject,
  XP.listLibraryPatches
);

export const getLibs = createMemoizedSelector(
  [getLibraryPatchesList, ProjectSelectors.getProject],
  [R.equals, R.equals],
  (patches, project) =>
    R.compose(
      R.map(R.sort(R.ascend(XP.getPatchPath))),
      R.groupBy(R.pipe(XP.getPatchPath, XP.getLibraryName)),
      R.reject(isPatchDeadTerminal),
      R.map(R.compose(markDeprecatedPatches, markDeadPatches(project)))
    )(patches)
);

export const getInstallingLibraries = R.compose(
  R.prop('installingLibraries'),
  getProjectBrowser
);
