告诉你的ai

请按以下要求执行：

1) 下载并读取这个工程中的 3 个文件：
- UnifiedRewardSDK/unified-reward-bridge.js
- UnifiedRewardSDK/demo/business-inject-demo.html
- UnifiedRewardSDK/docs/业务同学注入接入.md

2) 严格按「业务同学注入接入.md」执行，不要跳步：
- 先向我提问并确认业务决策（入口、请求时机、播放触发、成功/失败处理）
- 产出决策 JSON
- 再把 bridge 注入到我的 H5 页面
- 再把激励视频流程接到我们已约定的广告节点

3) 必须遵守文档中的硬约束：
- 必须在 App WebView 运行
- 不允许删掉 iOS/Android 路由判断
- 不允许改动底层固定字段（如 pgid/origin/sdk_id 等）
- 不允许移除 detectBridge
- 任一环节失败或超时必须返回 fail，不得当成功

4) 结合我的项目做最小改动接入：
- 优先复用我现有页面与事件节点
- 只在必要位置注入 SDK 与调用流程
- 输出你修改的文件清单和关键代码片段

5) 最终请给我两部分结果：
- A. 业务可读说明：我们的决策是什么、广告在什么节点请求/预加载/播放、失败如何回传
- B. 技术交付说明：你改了哪些文件、如何验证成功、失败回传样例
