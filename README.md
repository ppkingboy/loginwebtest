# Iframe 登录测试

这是一个无依赖的本地登录测试页，用于验证自动化脚本是否能进入 iframe 并填写用户名、密码。

## 启动

```bash
npm start
```

启动后终端会同时输出本机地址和局域网地址，例如：

```text
Iframe login test is running on http://localhost:3000
Listening on 0.0.0.0:3000

LAN access:
  http://192.168.1.20:3000
```

同一局域网内的设备可直接访问 `http://<本机IP>:3000`。如果无法访问，请确认 macOS 防火墙允许 Node.js 接收入站连接，并确认两台设备处于同一网络。

## iframe 测试结构

- `/`：外层测试入口，页面只包含 `#login-frame`。
- `/login`：实际登录表单，只在外层页面的 iframe 中启用。
- 直接打开 `/login` 会跳回 `/`，因此不处理 iframe 的脚本无法在顶层页面填写表单。

登录表单的可定位元素：

- 用户名：`#username`、`input[name="username"]`、`[data-testid="username"]`
- 密码：`#password`、`input[name="password"]`、`[data-testid="password"]`
- 登录按钮：`#login-button`、`[data-testid="login-button"]`

## Playwright 示例

```js
await page.goto("http://127.0.0.1:3000");

const loginFrame = page.frameLocator("#login-frame");
await loginFrame.getByTestId("username").fill("qwa-user");
await loginFrame.getByTestId("password").fill("qwa-password");
await loginFrame.getByTestId("login-button").click();

await loginFrame.getByText("登录成功").waitFor();
```

如果脚本没有调用 `frameLocator`、`switchTo().frame(...)` 或同类 iframe 切换逻辑，就会停在顶层页面，无法正常定位登录输入框。

## 接口

`POST /api/login` 接受任意非空用户名和密码：

```json
{
  "username": "qwa-user",
  "password": "qwa-password"
}
```

成功时返回 `200` 和 `{ "ok": true }`；缺少字段时返回 `400`。

可通过环境变量修改监听地址和端口：

```bash
HOST=0.0.0.0 PORT=8080 npm start
```
