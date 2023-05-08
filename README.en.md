[中文](README.md) | English

# logseq-plugin-media-ts

This plugin can generate timestamps for video, audio and Bilibili video, it takes you to the corresponding video/audio position when clicked.

## Usage

Insert media files (video and audio), supports URLs, local files with absolute path and files uploaded to Logseq and in relative path.

![demo](renderer.gif)

![demo](demo.gif)

Take notes while you watch the video.

![demo](right-sidebar.gif)

## Examples

It is recommended to setup a shortcut in the plugin's settings to quickly insert the timestamp, you can also use `/Media timestamp` for inserts. Please refer to the above animated gif.

For `video` and `audio` tags, the current playing position can be obtained automatically when inserting the timestamp. For Bilibili videos however, due to security limitations in Logseq, it is not possible to obtain its current playing position and when you click on the timestamp later, a reloading of the player can not be avoided.

You can copy the media address first and then insert it with `/Insert media`. That way the command will automatically handle the video address correctly for you, whether it is a URL, a local file's absolute path, or a relative path to a resource that has been uploaded to Logseq.

You can pass in "number of seconds", "minutes:seconds" or "hours:minutes:seconds".

```
{{renderer :media-timestamp, 60}}
{{renderer :media-timestamp, 01:00}}
{{renderer :media-timestamp, 00:01:00}}
```

You can give a block's reference as the second parameter if you want to create a timestamp for a media within a specific block, e.g:

```
{{renderer :media-timestamp, 60, ((63158bf5-1436-41e4-a8af-a4a03b8b5a5b))}}
```

## Syle Customization

You can customize styles using the following CSS classes. Refer to Logseq's document for how to customize styles, place your modifications in `custom.css`.

```css
.kef-media-ts-ts {
}
```

## Buy me a coffee

If you think the software I have developed is helpful to you and would like to give recognition and support, you may buy me a coffee using following link. Thank you for your support and attention.

<a href="https://www.buymeacoffee.com/sethyuan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
