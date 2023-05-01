import { UiSchema } from '@rjsf/utils';

// eslint-disable-next-line import/prefer-default-export
export const uiSchema: UiSchema = {
  template: {
    'ui:widget': 'textarea',
    'ui:options': {
      rows: 20,
    },
  },
  'ui:options': {
    orderable: false,
    submitButtonOptions: {
      norender: true,
    },
  },
};
