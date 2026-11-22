# 安装说明（给另一台电脑）

本文面向第一次安装本插件的机器（下文称“目标机器”）。三条路线按目标机器有没有 `git` 选一条即可。

## 0. 先确认两件事

**DSH 版本**：必须是 `>= 0.2.2-rc.5` 且 `< 0.3.0`。在 DSH 的“设置 → 关于”或 Plugins 页面底部可以看到版本号；版本不在范围内时，市场条目会被引擎范围挡掉。

**旧插件是否已装**：如果目标机器装过 `@local/dsh-export-center` 或 `dsh-export-center`，先移除。它们和本插件的行 id 都是 `export-center`，同时存在会冲突。

- 图形界面：Plugins 页面找到旧条目 → 移除；
- 命令行：
  ```powershell
  dsh plugin --profile desktop remove @local/dsh-export-center
  dsh plugin --profile desktop remove dsh-export-center
  ```

> `desktop` 是默认 profile 名。不确定时先看目录：
> ```powershell
> Get-ChildItem "$env:USERPROFILE\.dsh\profiles" -Directory | Select-Object Name
> ```
> 把命令里的 `desktop` 换成实际的目录名。

---

## 路线 A：市场索引安装（需要 git）

适合目标机器能访问 Gitee、且已安装 Git 的情况。

1. 确认 git：
   ```powershell
   git --version
   ```
   没有就安装（国内镜像，下载后双击、一路 Next）：
   `https://registry.npmmirror.com/-/binary/git-for-windows/v2.56.1.windows.1/Git-2.56.1-64-bit.exe`
   装完**完全退出 DSH 再打开**，让新的 PATH 生效。

2. DSH → **Plugins** → **Discover** → 添加索引，粘贴：
   ```
   https://raw.giteeusercontent.com/lirenmelodic-resonance/dsh-export-center/raw/master/market/index.json
   ```

3. 列表中出现 **Export center / 导出中心** → 安装。它实际拉取的是：
   ```
   git+https://gitee.com/lirenmelodic-resonance/dsh-export-center.git#f3ea45f93f45cf0fde92a18b91fa64f6558e1220
   ```

4. **完全退出 DSH 再打开**。

---

## 路线 B：本地目录安装（不需要 git）

适合目标机器没有 git、或网络不方便的情况。

1. 下载发行包（Gitee，国内直连）：
   ```
   https://gitee.com/lirenmelodic-resonance/dsh-export-center/releases/download/v1.0.1/dsh-export-center-plugin-1.0.1.zip
   ```
   校验值：

   | 项目 | 值 |
   |---|---|
   | 文件大小 | 297,583 字节 |
   | SHA-256 | `f490c13c07b270a647bb60a93db89e02bd38b337c1dfd65eb346c7e9b7ae973a` |

   PowerShell 校验：
   ```powershell
   Get-FileHash .\dsh-export-center-plugin-1.0.1.zip -Algorithm SHA256
   ```

2. 解压到**固定目录**，例如：
   ```
   D:\dsh-plugins\dsh-export-center-plugin
   ```
   安装方式是链接该目录，**之后不要删除或移动**。路径只用英文、数字和短横线，**不要放在中文目录下**（profile 里存的是字面路径，中文容易出乱码）。

3. 安装：
   ```powershell
   dsh plugin --profile desktop add "D:\dsh-plugins\dsh-export-center-plugin"
   ```
   如果 `dsh` 不在 PATH 中，可以用安装目录里的启动器，例如：
   ```powershell
   & "D:\deepseek\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add "D:\dsh-plugins\dsh-export-center-plugin"
   ```

4. 打开 DSH → Plugins，确认 `dsh-export-center-plugin` 已启用（未启用就手动打开）。

5. **完全退出 DSH 再打开**。

---

## 路线 C：从已安装的机器离线拷贝（最快）

如果两台机器之间能传文件，直接把已安装机器上的整个插件目录拷过去，例如：

```
<另一台机器>\导出中心\dsh-export-center-plugin
```

拷到目标机器的固定目录后，按路线 B 的第 3、4、5 步安装并重启即可。

---

## 安装完成后验证

1. 侧边栏出现 **导出中心**；
2. 面板标题栏显示 **v1.0.1**；
3. 第一次使用建议：勾选 1～2 条会话 → 导出 → 再导入到另一个工作区，确认恢复出来的会话可以打开。

---

## 故障排查

| 现象 | 原因与处理 |
|---|---|
| 面板顶部提示 Host 未加载 | 没有重启，或 bundle 未启用。完全退出 DSH 后重开；Plugins 页面确认已启用 |
| 安装时 pnpm 报 git 相关错误 | 目标机器没有 git。改用路线 B 或 C |
| DSH 启动时报 row id 冲突 | 旧插件没移除，见第 0 节 |
| 市场里看不到条目 | DSH 版本超出 `0.2.2-rc.5 – <0.3.0`，或索引 URL 加错 |
| 安装后标题不是 v1.0.1 | 装到了旧版本，检查发行包或市场条目 |
| 恢复会话后附件缺失 | 先确认导入报告里的 `attachments.failed` / `idMismatch`，把报告内容反馈 |
