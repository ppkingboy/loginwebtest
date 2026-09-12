const fieldset = document.querySelector("#credentials-fieldset");
const form = document.querySelector("#login-form");
const button = document.querySelector("#login-button");
const buttonLabel = button.querySelector(".button-label");
const result = document.querySelector("#login-result");

const isEmbedded = document.documentElement.dataset.embedded === "true";

if (isEmbedded) {
  fieldset.disabled = false;
  window.__IFRAME_LOGIN_TEST__ = {
    embedded: true,
    formId: form.id,
  };
} else {
  window.__IFRAME_LOGIN_TEST__ = {
    embedded: false,
    formId: form.id,
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isEmbedded || !form.reportValidity()) {
    return;
  }

  const formData = new FormData(form);
  button.disabled = true;
  result.dataset.state = "loading";
  result.textContent = "正在验证...";
  buttonLabel.textContent = "登录中...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });

    const data = await response.json();
    result.dataset.state = response.ok && data.ok ? "success" : "error";
    result.textContent = data.message || "登录请求未完成。";
    window.__LOGIN_RESULT__ = data;
  } catch {
    result.dataset.state = "error";
    result.textContent = "无法连接登录接口，请确认本地服务仍在运行。";
    window.__LOGIN_RESULT__ = {
      ok: false,
      message: result.textContent,
    };
  } finally {
    button.disabled = false;
    buttonLabel.textContent = "登录";
  }
});
