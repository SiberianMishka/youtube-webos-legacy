# YouTube AdFree Legacy for webOS 1/2

Unofficial YouTube AdFree fork for early LG webOS TVs. Based on
`v0.3.2-webkit1` and kept compatible with the old WebKit runtime used by
webOS 1.x/2.x.

## Features

- Ad Blocking for videos and Shorts
- [SponsorBlock](https://sponsor.ajay.app/) Integration with coloured timeline markers and automatic segment skipping
- [Autostart Support](#autostart)
- GREEN-button configuration
- Force Maximum Video Quality
- YouTube Logo Removal
- Bypass account selector screen
- Fix for the black player overlay shown with current YouTube TV controls
- Fix for Magic Remote reopening the search keyboard from search results

## Tested on

- LG 47LB679V-ZH
- webOS 1.4.0-2536
- firmware 05.05.90

Other models may work but have not been verified.

> **Note**
>
> Press the **Green** button on your remote to access the configuration
> screen.

---

## Requirements

- Uninstall the official YouTube app before installing this one.

---

## Installation

You can install the app using one of the following methods:

- [**Device Manager**](https://github.com/webosbrew/dev-manager-desktop):
  install a pre-built `.ipk` from this fork's
  [Releases](https://github.com/SiberianMishka/youtube-webos-legacy/releases).
- **Command line (webOS CLI):** configure the TV as described under
  [Development setup](#development-setup), then run `npm run deploy`.
- [**webOS Homebrew Channel**](https://github.com/webosbrew/webos-homebrew-channel):
  useful for rooted-TV access. For webOS 1/2, use the legacy `.ipk` from this
  fork rather than a current upstream build.

---

## Autostart

To enable autostart, execute this command on the TV through SSH or Telnet:

```sh
luna-send-pub -n 1 'luna://com.webos.service.eim/addDevice' '{"appId":"youtube.leanback.v4","pigImage":"","mvpdIcon":""}'
```

This registers the app as an input source. If it was the last selected input,
the TV can launch it automatically. Keeping the app in the background improves
startup time at the cost of a small increase in idle memory usage.

To disable autostart:

```sh
luna-send -n 1 'luna://com.webos.service.eim/deleteDevice' '{"appId":"youtube.leanback.v4"}'
```

---

## Development setup

### Prerequisites

- Node.js with npm
- Git

The webOS CLI is installed as a project development dependency.

### Setup

```sh
git clone https://github.com/SiberianMishka/youtube-webos-legacy.git
cd youtube-webos-legacy
npm install
```

### Building an IPK

```sh
npm run build -- --env production=true
npm run test:compat
npm run package
```

The compatibility check parses every generated JavaScript file as ES5 and
fails if an artifact is missing, empty, or contains newer syntax. The
`.ipk` file is generated in the project root and can be installed with Device
Manager or the webOS CLI.

### On the TV

> **Important**
>
> If the TV is rooted, follow [Alternate setup](#alternate-setup-rooted-tv)
> instead.

1. Create an [LG Developer account](https://webostv.developer.lge.com/login).
2. Install the
   [Developer Mode app](https://in.lgappstv.com/main/tvapp/detail?appId=232503)
   from the LG Content Store.
3. Sign in and enable **Developer Mode** and **Key Server**.

### Add the TV to the CLI

```sh
npm exec -- ares-setup-device
```

Follow the prompts:

1. Add a device.
2. Enter the IP address shown by the Developer Mode app.
3. Keep the default values unless your setup requires different ones.
4. Enter the six-character passphrase shown on the TV.

Verify the configuration:

```sh
npm exec -- ares-setup-device --list
```

Example:

```text
name            deviceinfo                     connection  profile  passphrase
--------------  -----------------------------  ----------  -------  ----------
mytv (default)  prisoner@192.168.137.102:9922  ssh         tv       EF32E8
```

---

## Installing to the TV

```sh
npm run deploy
```

This installs the package on the default device selected with
`ares-setup-device`.

## Debugging

Inspect the running app with webOS Web Inspector:

```sh
npm exec -- ares-inspect -d <device_name> youtube.leanback.v4
```

Omit `-d <device_name>` when the target TV is the default device.

---

## Alternate setup (rooted TV)

1. Enable SSH in Homebrew Channel.
2. Generate an SSH key:

   ```sh
   ssh-keygen -t rsa
   ```

3. Copy the private key to `~/.ssh` (`%USERPROFILE%\.ssh` on Windows).
4. Append the public key to `/home/root/.ssh/authorized_keys` on the TV.
5. Add the device:

   ```sh
   npm exec -- ares-setup-device -a webos \
     -i "username=root" \
     -i "privatekey=id_rsa" \
     -i "passphrase=SSH_KEY_PASSPHRASE" \
     -i "host=TV_IP" \
     -i "port=22"
   ```

---

## Quick commands

### Build, install, and launch

```sh
npm run build -- --env production=true && npm run package && npm run deploy && npm run launch
```

Launch a specific video directly:

```sh
npm run launch -- -p '{"contentTarget":"v=F8PGWLvn1mQ"}'
```

## Upstream and license

Based on:

- <https://github.com/webosbrew/youtube-webos>
- <https://github.com/throwaway96/youtube-webos>

Licensed under GPLv3. This project is not affiliated with Google, YouTube, LG,
or the webOS Brew project.
