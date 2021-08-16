## CM-COMMIT 
> 用Nodejs实现的TAPD源码关联的git提交工具。

### 安装
---

`npm i -g cm-commit`

**如果npm全局包安装位置需要权限的话 `--unsafe-perm`**

`sudo npm i -g cm-commit --unsafe-perm`

### 使用
---

`cmc [option]`

首次次执行`cmc`命令，需要添加TAPD的账号密码，可以通过`cmc -u`进行修改。

后续执行`cmc | cmc -m [msg]`命令，会进行登录并从TAPD拉到登录用户的待办,选择后则会直接获取到该待办的关键字并进行一次`git commit`。

Option参数
  - -v, --version 查看版本号
  - -u, --user 修改账号密码
  - -l, --last [msg] 获取上一次源码关联的commit,[msg]为自定义提交信息
  - -m, --commit [msg] 需要自定义提交信息时使用
  - -h, --help display help for command

### 注意事项
1. 使用 `cmc` 拉取的待办事项中类型为 Task 的任务，在提交源码关联关键字的时候取的是其对应 Story 的源码关键字。