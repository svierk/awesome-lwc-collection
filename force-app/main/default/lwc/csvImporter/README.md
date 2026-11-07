# CSV Importer

Imports CSV files into Salesforce in steps: the file is read and previewed, then its columns are mapped to the fields of an object.

**Type:** Component

**Available in:** App Page · Home Page · Record Page

<img src="../../../../../images/csv-importer.png" alt="csv-importer" width="500"/>

## Read on Medium

<a href="https://javascript.plainenglish.io/how-to-build-a-simple-csv-parser-with-lightning-web-components-464a110a1cd2">
  <img src="https://miro.medium.com/v2/resize:fit:1200/1*0FOK1CG3uS_qlZosob1Bww.jpeg" alt="How to Build a Simple CSV Parser with Lightning Web Components" width="350"/>
</a>

**[How to Build a Simple CSV Parser with Lightning Web Components](https://javascript.plainenglish.io/how-to-build-a-simple-csv-parser-with-lightning-web-components-464a110a1cd2)**

## Attributes

| Name                   | Type   | Default | Description                                                                                              |
| ---------------------- | ------ | ------- | -------------------------------------------------------------------------------------------------------- |
| import-object-api-name | string | ''      | The object the rows are imported into, e.g. 'Contact'. Without it, users enter the object in the wizard. |
| max-file-size-mb       | number | 5       | The largest file in megabytes that can be read.                                                          |
| max-rows               | number | 10000   | The most rows a file may have, not counting the header.                                                  |

## Events

| Name   | Detail                                                                          | Description                                                                         |
| ------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| parsed | A copy of the result: `fileName`, `headers`, `keyField`, `rows` and `delimiter` | Fired when a file was parsed. `keyField` names the property holding each row's key. |

## Usage

```html
<c-csv-importer import-object-api-name="Contact" max-file-size-mb="10" onparsed={handleParsed}></c-csv-importer>
```

### Upload

Drop a `.csv` file on the upload area or select it. The importer shows the first 20 rows and how many rows the file has.

- The delimiter is detected from the first line: comma, semicolon or tab, whichever occurs most often outside quoted fields. It can also be chosen by hand.
- The encoding is UTF-8 by default; choose Windows-1252 for files exported by older versions of Excel. Changing the delimiter or the encoding reads the file again.
- Files larger than max-file-size-mb or with more rows than max-rows are rejected with a message.

Files are parsed according to [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) by the shared `c/csvParser` module:

- Quoted fields may contain delimiters, line breaks and doubled quotes (`""`).
- Empty lines are ignored, including a trailing one.
- Rows with fewer columns than the header are filled with empty values, and values beyond the last header column are dropped.
- Empty and duplicate column names get a unique name, such as `Column 2` or `Name (2)`.

If a file cannot be read or is not valid CSV, for example because a quote is never closed, the importer clears the preview and shows an error message.

### Map fields

The next step maps every column to a field of the object set in import-object-api-name, or of the object users enter by its API name. It isn't called object-api-name, because record pages set that property to the object of the page.

- Columns are matched automatically when they equal a field's label or API name, ignoring case, spaces and punctuation: `First Name`, `first_name` and `FirstName` all match `FirstName`.
- Only fields records can be created with are offered. Columns without a field are skipped, and a field can't be chosen for two columns.
- **Download mapping** saves the mapping as JSON to use it again; **Upload a mapping** applies a saved one, skipping fields the object doesn't have:

```json
{
  "version": 1,
  "objectApiName": "Contact",
  "mapping": { "First Name": "FirstName", "E-Mail": "Email", "Notes": "" }
}
```

Going back to the upload keeps the mapping; a new file keeps the fields of the columns it still has.

## Component Dependencies

| Name               | Type | Description                                                                             |
| ------------------ | ---- | --------------------------------------------------------------------------------------- |
| csvImporterMapping | LWC  | Maps the columns of a CSV file to the fields of a Salesforce object.                    |
| csvParser          | LWC  | Shared module that parses comma, semicolon or tab separated text according to RFC 4180. |
| errorAlert         | LWC  | Inline alert that shows error messages to the user.                                     |
| errorUtils         | LWC  | Shared functions to read error messages and show error toasts.                          |
