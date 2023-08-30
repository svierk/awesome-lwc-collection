# Open Record Page Flow Action

Component to forward to a record page from flow. How the component was built and works in detail is explained in the following Medium post: [How to open a Record Page from Salesforce Flow using LWC](https://javascript.plainenglish.io/how-to-open-a-record-page-from-salesforce-flow-using-lwc-a8a94bc0c9ba)

<img src="../../../../../images/open-record-page-flow-action.png" alt="open-record-page-flow-action" width="500"/>

## Attributes

| Name      | Type   | Default   | Description                                                      |
| --------- | ------ | --------- | ---------------------------------------------------------------- |
| record-id | string |           | Record Id of the record page to which the action should forward. |
| target    | string | '\_blank' | Open the page in the same '\_self' or in a new tab '\_blank '.   |
