# Happy 多端本地打包 SOP

适用范围：在本机从当前工作树构建可安装的 macOS 和 Android 包。该流程不使用 EAS 远端构建，不发布商店，也不替代正式发布的证书签名与 Apple 公证。

## 产物与边界

| 平台 | 本地构建命令 | 主要产物 | 可安装性 |
| --- | --- | --- | --- |
| macOS | `pnpm tauri:build:production` | `.app`、`.dmg` | 可本机安装；未公证时首次打开可能需要在 Finder 右键“打开” |
| Android | `./gradlew assembleRelease` | `app-release.apk` | 可通过 `adb install -r` 或文件管理器安装；当前以 debug keystore 签名，不可作为正式对外发行包 |

任务代码、构建依赖、原生工程和产物均应在同一个工作树内完成。不要从临近目录复制二进制，也不要把远端 EAS 构建结果当作本地构建验证结果。

## 前置条件

- 在仓库根目录执行 `pnpm install --frozen-lockfile`，依赖与锁文件一致。
- macOS：已安装 Xcode Command Line Tools、Rust/Cargo、Node.js 与 pnpm；Apple Silicon 构建产物为 `aarch64`。
- Android：已安装 JDK 21、Android SDK、平台工具（`adb`）；`ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 可被 Gradle 读取。
- 构建前确认变更所在工作树，例如：`git status --short`。不要在原始工作区和 worktree 间混用产物。

建议先运行：

```bash
pnpm --dir packages/happy-cli exec tsc --noEmit
pnpm --dir packages/happy-app typecheck
```

若应用 typecheck 仅报既有 `sources/sync/apiGithub.spec.ts` 的 `fetch.preconnect` mock 错误，应单独记录为基线问题；不得将新的业务代码错误归入该例外。

## macOS 本地 DMG

从仓库根目录执行：

```bash
cd packages/happy-app
PATH="/opt/homebrew/bin:$PATH" pnpm tauri:build:production
```

产物路径：

```text
packages/happy-app/src-tauri/target/release/bundle/macos/Happy.app
packages/happy-app/src-tauri/target/release/bundle/dmg/Happy_0.1.4_aarch64.dmg
```

构建后的最小校验：

```bash
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/release/bundle/macos/Happy.app
shasum -a 256 src-tauri/target/release/bundle/dmg/Happy_0.1.4_aarch64.dmg
```

### DMG 封装卡住或失败

Tauri 的 DMG 脚本会创建可写的临时镜像。若上次异常退出，先只卸载与当前包对应的临时镜像，再重试：

```bash
hdiutil info | rg 'rw\..*Happy_.*\.dmg|Happy_.*\.dmg'
hdiutil detach /dev/diskN
```

其中 `/dev/diskN` 必须由上一条命令明确确认；不要使用通配符或卸载无关镜像。之后重新执行构建命令。

本地 ad-hoc 签名只能保证包结构完整，不能通过 Gatekeeper 的开发者身份和公证校验。正式分发需要 Developer ID 签名及 Apple 公证凭据。

## Android 本地 APK

原生 Android 目录已提交，因此本地包不需要先执行 `expo prebuild`。从仓库根目录执行：

```bash
cd packages/happy-app/android
APP_ENV=preview ./gradlew assembleRelease
```

产物路径：

```text
packages/happy-app/android/app/build/outputs/apk/release/app-release.apk
```

安装到已连接设备：

```bash
adb devices
adb install -r app/build/outputs/apk/release/app-release.apk
```

验证包信息：

```bash
apkanalyzer manifest application-id app/build/outputs/apk/release/app-release.apk
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

当前原生配置的 release 构建使用仓库中的 debug keystore，适用于本地验证。若要做可升级、可对外分发的 APK/AAB，必须配置专用 keystore、别名和密码，并改用受保护的签名配置；不得提交私钥或密码。

### Android 常见问题

- `SDK location not found`：设置 `ANDROID_HOME` 或在 `android/local.properties` 设置 `sdk.dir`（该文件不得提交）。
- JDK/Gradle 不兼容：本项目当前 Gradle wrapper 为 8.14.3，使用 JDK 21。
- 设备安装失败：先核对同 applicationId 是否由不同签名安装；必要时由设备所有者卸载旧包后重装。
- 本地运行调试而非生成 APK：在 `packages/happy-app` 执行 `pnpm android:preview`。

## 交付检查清单

- [ ] 本地 TypeScript 校验通过，或已记录唯一的既有基线问题。
- [ ] macOS：`.app` 通过 `codesign --verify`，DMG 已生成并计算 SHA-256。
- [ ] Android：APK 已生成，`apksigner verify` 通过，并实际安装到目标设备。
- [ ] 记录构建的工作树、提交版本、`APP_ENV`、产物绝对路径及 SHA-256。
- [ ] 明确标注包是“本地验证包”还是“正式签名发行包”。
