# Camera Capture

A live camera view that takes photos with the Media Capture and Streams API, to build into your own components.

**Type:** Building Block

**Available in:** Not exposed in the Lightning App Builder - intended to be embedded in other components.

## Attributes

| Name          | Type    | Default | Description                                                                                                    |
| ------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| camera        | string  | 'front' | The camera to ask for, front or back. Devices with only one camera use that one.                               |
| hide-controls | boolean | false   | If present, the buttons are hidden, so that a parent can use its own with the start, stop and capture methods. |
| start         | method  |         | Starts the camera. A running camera is stopped first.                                                          |
| stop          | method  |         | Stops the camera. Does nothing if it isn't running.                                                            |
| capture       | method  |         | Takes a photo and fires the capture event. Does nothing if the camera isn't running.                           |

## Events

| Name    | Detail        | Description                                                                 |
| ------- | ------------- | --------------------------------------------------------------------------- |
| capture | `{ dataUrl }` | Fired when a photo was taken. dataUrl contains the photo as a PNG data URL. |

## Usage

```html
<c-camera-capture camera="back" oncapture={handleCapture}></c-camera-capture>
```

What happens with the photo is up to you. Take User Profile Picture uses it for the profile of the current user, and the camera stops by itself when the component is removed or hidden, for example when the user moves on to another page in Lightning.

## Custom Labels

The texts users see are Custom Labels, so they can be translated in Setup with the Translation Workbench. Copy them together with the component.

| Name                               | Value                                         |
| ---------------------------------- | --------------------------------------------- |
| CameraCapture_CapturePhoto         | Capture Photo                                 |
| CameraCapture_Error                | Error                                         |
| CameraCapture_ErrorAccessingCamera | Error accessing camera                        |
| CameraCapture_NotSupported         | getUserMedia is not supported in this browser |
| CameraCapture_StartCamera          | Start Camera                                  |
| CameraCapture_StopCamera           | Stop Camera                                   |
| ErrorUtils_UnknownError            | Unknown error                                 |

## Component Dependencies

| Name       | Type | Description                                                    |
| ---------- | ---- | -------------------------------------------------------------- |
| errorUtils | LWC  | Shared functions to read error messages and show error toasts. |
