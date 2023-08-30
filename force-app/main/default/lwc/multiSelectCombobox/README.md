# Multi Select Combobox

Combobox with different configuration options that also supports multi select. How the component was built and works in detail is explained in the following Medium post: [How to Create the LWC Multi-Select Combobox that Salesforce is Still Missing](https://javascript.plainenglish.io/how-to-create-the-lwc-multi-select-combobox-that-salesforce-is-still-missing-c7bf3a2850dd)

<img src="../../../../../images/multi-select-combobox.png" alt="multi-select-combobox" width="400"/>

## Attributes

| Name          | Type    | Default            | Description                                                                                                    |
| ------------- | ------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| disabled      | boolean | false              | If present, the combobox is disabled and users cannot interact with it.                                        |
| label         | string  | ''                 | Text label for the combobox.                                                                                   |
| name          | string  |                    | Specifies the name of the combobox.                                                                            |
| options       | Array   | []                 | A list of options that are available for selection. Each option has the following attributes: label and value. |
| placeholder   | string  | 'Select an Option' | Text that is displayed before an option is selected, to prompt the user to select an option.                   |
| read-only     | boolean | false              | If present, the combobox is read-only. A read-only combobox is also disabled.                                  |
| required      | boolean | false              | If present, a value must be selected before a form can be submitted.                                           |
| single-select | boolean | false              | If present, the combobox only allows the selection of a single value.                                          |
| show-pills    | boolean | false              | If present, the combobox will show a pill container with the currently selected options.                       |
