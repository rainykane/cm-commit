## CM-COMMIT 
> 一个TAPD源码关联的git提交工具。

### 安装
---

`npm i -g cm-commit --registry http://47.106.165.142:4873`

**如果npm全局包安装位置需要权限的话 `--unsafe-perm`**

`sudo npm i -g cm-commit --registry http://47.106.165.142:4873 --unsafe-perm`

### 使用
---

`cmc [option]`

第一次执行`cmc`命令，需要添加TAPD的账号密码，后续可以通过`cmc -u`进行修改。

后续执行`cmc | cmc -m [msg]`命令，会进行登录并从TAPD拉到登录用户的代办**Bug & Story**,选择后则会直接获取到该代办的关键字并进行一次`git commit`。

Option参数
  - -v, --version 查看版本号
  - -u, --user 修改账号密码
  - -l, --last [msg] 获取上一次源码关联的commit,[msg]为自定义提交信息
  - -m, --commit [msg] 需要自定义提交信息时使用
  - -h, --help display help for command
