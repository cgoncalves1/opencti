import React from 'react';
import NavToolbarMenu, { MenuEntry } from '@components/common/menus/NavToolbarMenu';
import useHelper from '../../../utils/hooks/useHelper';

const ImportMenu = () => {
  const { isFeatureEnable } = useHelper();
  const isDataTableEnabled = isFeatureEnable('DATA_TABLES');
  if (!isDataTableEnabled) {
    return (
      <NavToolbarMenu
        entries={[{
          path: '/dashboard/data/import',
          label: 'Import',
        }]}
      />
    );
  }
  const entries: MenuEntry[] = [
    {
      path: '/dashboard/data/import',
      label: 'Import',
    },
    {
      path: '/dashboard/data/import/file',
      label: 'Uploaded files',
    },
    {
      path: '/dashboard/data/import/workbench',
      label: 'Analyst workbenches',
    },
  ];
  return <NavToolbarMenu entries={entries} />;
};

export default ImportMenu;