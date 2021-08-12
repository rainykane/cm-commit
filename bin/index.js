#!/usr/bin/env node
const { Command } = require('commander');
const inquirer = require("inquirer");
const puppeteer = require('puppeteer');
const os = require('os');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const { 
  getCartList,
  getCartDetail,
  getShortUrl,
  UA
} = require('./request');

const DOMAIN = 'https://www.tapd.cn/';
const LOGIN_URL = 'https://www.tapd.cn/cloud_logins/login';
const CONFIG_PATH = __dirname + '/.config';
const CONFIG = { 
  headless: true,
  args: [ '–disable-gpu', '–disable-dev-shm-usage', '–disable-setuid-sandbox', '–no-first-run', '–no-sandbox', '–no-zygote', '–single-process'] 
};

// 填写用户名密码
const addUser = async () => {
  const prompts = [
    {
      type: "input",
      message: '用户名（TAPD）:',
      name: "username",
    },
    {
      type: "input",
      message: '密码:',
      name: "password",
    }
  ];
  const account = await inquirer.prompt(prompts);
  fs.writeFile(CONFIG_PATH, JSON.stringify(account), (error) => { 
    if(!error) {
      console.log('设置成功！');
    }else {
      console.log(error);
    }
  });
  return account;
}

// 获取上次的命令
const last = async (msg) => {
  if(!fs.existsSync(CONFIG_PATH)) {
    console.log('没有上次提交的记录');
    return;
  }else {
    const { command } = JSON.parse(fs.readFileSync(CONFIG_PATH));
    if(command) {
      const questions = [
        {
          type: "list",
          name: "history",
          choices: [{
            name: command.replace(/{msg}/g, msg)
          }, {
            name: '取消操作',
          }],
        }
      ];
      const answer = await inquirer.prompt(questions);
      if(answer.history !== '取消') {
        exec(execCommand, { encoding: 'utf-8' });
      }
    }else {
      console.log('没有上次提交的记录');
      return;
    }
  }
}

// 登录
const login = async (account) => {
  console.log(`正在登陆(TAPD)：${account.username}`);
  const browser = await puppeteer.launch(CONFIG);
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.goto(LOGIN_URL);
  await page.waitForSelector('#username');
  await page.type('#username', account.username);
  await page.type('#password_input', account.password);
  await page.click('#tcloud_login_button');
  await page.waitForNavigation({
    waitUntil: 'load'
  });
  const address = await page.evaluate(_ => document.location.href)
  if(address.includes('/cloud_logins/login')) {
    const error = await page.$eval('#error-tips', el => el.innerText);
    console.log(error + '。请通过 cmc -u 重新设置账号');
    await browser.close();
    return false;
  }else {
    await page.waitForSelector('.avatar-text-default');
    const nickname = await page.$eval('.avatar-text-default', el => el.title );
    account.nickname = nickname;
    const cookie = await page.cookies();
    global.cookie = cookie.map(item => `${item.name}=${item.value}`).join('; ');
    account.cookie = global.cookie;
    // 把cookie写入
    fs.writeFile(CONFIG_PATH, JSON.stringify(account), () => {});
    await browser.close();
    return account;
  }
}

// 选择需求项
const selectTask = async () => {
  const todoList = await getTodoList();
  if(!todoList) return false;
  const choices = todoList.map((item) => {
    // 只拉Bug 和 需求（Story）
    const flag = item.type === 'Bug' || item.type === 'Story';
    return flag ? {
      key: item.id,
      name: `${item.type}: ${item.title}`,
      value: item,
    } : '';
  });
  const questions = [
    {
      type: "list",
      name: "Task",
      choices,
    }
  ];
  return inquirer.prompt(questions);
};

// 获取我的待办需求
const getTodoList = async () => {
  const res = await getCartList();
  if(typeof res.data === 'string') return false;
  const cartId = res.data.data.find((item) => item.title === '我的待办').id;
  const detailRes = await getCartDetail(cartId);
  return detailRes.data.data.list;
}

// 获取源码关联关键字
const getKeyword = async (task, nickname) => {
  const { id, type, title, title_url, workspace_id } = task;
  const res = await getShortUrl(workspace_id, `${DOMAIN}${title_url}`);
  const shortUrl = res.data;
  const keyword = `--${type.toLowerCase()}=${id.slice(-7)} --user=${nickname} ${title} ${shortUrl}`;
  return keyword
}

// 检查登录态
const checkLogin = async () => {
  const res = await getCartList();
  return !(typeof res.data === 'string')
}

// 主流程
const run = async (msg) => {
  let account;
  if(!fs.existsSync(CONFIG_PATH)) {
    await addUser();
    return;
  }else {
    account = JSON.parse(fs.readFileSync(CONFIG_PATH));
  }
  // 判断是否需要登录
  if(!account.cookie) {
    account = await login(account);
  }else {
    global.cookie = account.cookie;
    const flag = await checkLogin();
    if(!flag) {
      account = await login(account);
    }
  }
  if(!account) return;
  const answers = await selectTask();
  const keyword = await getKeyword(answers.Task, account.nickname);
  const msgFlag = answers.Task.type === 'Bug' ? 'fix' : 'feat';
  const command = `git commit -m '${msgFlag}: ${msg} ${keyword}'`;
  console.log(command);
  exec(command, { encoding: 'utf-8' });
  // 将命令保存
  account.command = `git commit -m '${msgFlag}: {msg} ${keyword}'`;
  fs.writeFile(CONFIG_PATH, JSON.stringify(account), () => {});
}

const program = new Command();
program
  .version('1.3.0', '-v, --version', '查看版本号')
  .description('自动拉取tapd源码关联关键字并提交')
  .option('-u, --user', '修改账号密码')
  .option('-l, --last [value]', '获取上一次源码关联的commit')
  .option('-m, --commit [value]', '添加自定义commit内容')
  .parse(process.argv)
  .action((argv) => {
    try{
      // 需要提前判断并修改权限
      fs.access(__dirname, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK, (error) => {
        if(error) {
          console.log(os.type());
          if(os.type === 'Windows_NT') {
            console.log(`请赋予当前执行目录(${__dirname})的读写执行权限`)
          }else {
            execSync(`sudo chmod 777 ${__dirname}`, { encoding: 'utf-8' });
          }
        }
        if(argv.user) {
          addUser();
        }else if(argv.last) {
          const msg = argv.last === true ? '' : argv.last;
          last(msg);
        }else {
          const msg = argv.commit && typeof argv.commit === 'string' ? argv.commit : '';
          run(msg);
        }
      })
    }catch(error) {
      console.log(error);
    }
  });

// 核心！！
program.parse();