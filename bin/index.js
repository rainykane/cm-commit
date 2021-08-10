#!/usr/bin/env node
const { Command } = require('commander');
const inquirer = require("inquirer");
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const fs = require('fs');
const { 
  getCartList,
  getCartDetail,
  UA
} = require('./request');

const DOMAIN = 'https://www.tapd.cn/';
const LOGIN_URL = 'https://www.tapd.cn/cloud_logins/login';
const DASHBOARD_URL = 'https://www.tapd.cn/my_dashboard';
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
      message: '用户名:',
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
    }
  });
  return account;
}

// 登录
const login = async (page, account) => {
  console.log(`正在登陆tapd：${account.username},${account.password}`);
  await page.goto(LOGIN_URL);
  await page.waitForSelector('#username');
  await page.type('#username', account.username);
  await page.type('#password_input', account.password);
  await page.click('#tcloud_login_button');
  await page.waitForNavigation({
    waitUntil: 'load'
  });
  const cookie = await page.cookies();
  global.cookie = cookie.map(item => `${item.name}=${item.value}`).join('; ');
  account.cookie = global.cookie;
  // 把cookie写入
  fs.writeFile(CONFIG_PATH, JSON.stringify(account), () => {});
}

// 选择需求项
const selectTask = async () => {
  const todoList = await getTodoList();
  const choices = todoList.map((item) => {
    // 只拉Bug 和 需求（Story）
    const flag = item.type === 'Bug' || item.type === 'Story';
    return flag ? {
      key: item.id,
      name: `${item.type}: ${item.title}`,
      value: item.title_url,
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
  if(!res.data) return;
  const cartId = res.data.data.find((item) => item.title === '我的待办').id;
  const detailRes = await getCartDetail(cartId);
  return detailRes?.data?.data?.list || [];
}

// 主流程
const run = async () => {
  let account;
  if(!fs.existsSync(CONFIG_PATH)) {
    await addUser();
    return;
  }else {
    account = JSON.parse(fs.readFileSync(CONFIG_PATH));
  }
  const browser = await puppeteer.launch(CONFIG);
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  // 判断是否需要登录？？
  if(!account.cookie) {
    console.log('99999999');
    await login(page, account);
  }else {
    page.setCookie = account.cookie;
    await page.goto(DASHBOARD_URL);
    await page.waitForNavigation({
      waitUntil: "load"
    })
  }
  const answers = await selectTask();
  await page.goto(`${DOMAIN}${answers.Task}`);
  await page.waitForResponse(res => {
    return res.request().url().includes('/generate_short_url') && res.ok();
  })
  const value = await page.$eval('#svn_keyword', el => el.dataset.clipboardText);
  const command = `git commit -m 'feat: ${value}'`;
  exec(command, { encoding: 'utf-8' });
  console.log(command);
  await browser.close();
}

const program = new Command();
program
  .version('0.0.1', '-v, --version', '查看版本号')
  .description('自动拉取tapd源码关联关键字并提交')
  .option('-u, --user', '修改账号密码')
  .parse(process.argv)
  .action((argv) => {
    if(argv.user) {
      addUser();
    }else {
      run();
    }
  });

// 核心！！
program.parse();