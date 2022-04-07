# logseq-plugin-media-ts

本插件能够生成视频、音频以及 B 站视频的时间戳，点击时间戳后会跳转到对应的音视频位置。

This plugin can generate timestamps for video, audio and Bilibili video, it takes you to the corresponding video/audio position when clicked.

## 使用展示 (Usage)

插入媒体文件（视频、音频），支持网络上的 URL，本地全路径的文件和已上传至 Logseq 的相对路径的文件。

Insert media files (video and audio), supports URLs, local files with absolute path and files uploaded to Logseq and in relative path.

![demo](renderer.gif)

![demo](demo.gif)

观看视频的同时记录笔记。

Take notes while you watch the video.

![demo](right-sidebar.gif)

## 使用示例 (Examples)

推荐使用 `/Media timestamp` 来快捷插入以下代码。请参看上方动图。

对于`video`与`audio`标签可在插入时间戳时自动获取当前位置。对于 B 站视频，出于 Logseq 本身的一些安全性限制，无法获取当前位置，点击时间戳跳转时也不能直接定位，需要重新加载播放器。

It is recommended to use `/Media timestamp` for quick inserts. Please refer to the above animated gif.

For `video` and `audio` tags, the current playing position can be obtained automatically when inserting the timestamp. For Bilibili videos however, due to security limitations in Logseq, it is not possible to obtain its current playing position and when you click on the timestamp later, a reloading of the player can not be avoided.

你可以先将视频地址拷贝下来，再用 `/insert video` 插入，这样命令可以自动帮你正确处理视频地址，无论它是一个网址，本机文件的绝对路径，还是已上传到 Logseq 的一个资源的相对路径。
插入音频也是采用与上面视频同样的方法，不过这次用 `/insert audio`。

You can copy the video address first and then insert it with `/insert video`. That way the command will automatically handle the video address correctly for you, whether it is a URL, a local file's absolute path, or a relative path to a resource that has been uploaded to Logseq.
Insert audio in the same way as the video above, but this time with `/insert audio`.

可以传“秒数”，也可以传“分:秒”或“时:分:秒”。

You can pass in "number of seconds", "minutes:seconds" or "hours:minutes:seconds".

```
{{renderer :media-timestamp, 60}}
{{renderer :media-timestamp, 01:00}}
{{renderer :media-timestamp, 00:01:00}}
```

## 用户配置 (User configs)

```json
{
  "disabled": false,
  "mediaTsShortcut": ""
}
```

在 Logseq 的插件页面打开插件的配置后，有以下几项配置可供使用，请参照上方代码块进行设置（各项的默认值以体现在代码块中）：

- `mediaTsShortcut`: 为生成 media-timestamp 设置快捷键，例如`mod+shift+m`。

There are a couple of user settings available when you access the plugin settings from Logseq's plugins page. Please refer to the source block above (Default values are given in the source block).

- `mediaTsShortcut`: Assign a shortcut for media-timestamp operation, e.g. `mod+shift+m`.

## 自定义样式 (Syle Customization)

你可以通过以下 CSS 类来自定义样式。参照 Logseq 自定义样式的文档操作，将内容放在`custom.css`中即可。

You can customize styles using the following CSS classes. Refer to Logseq's document for how to customize styles, place your modifications in `custom.css`.

```css
.kef-media-ts-ts {
}
```
