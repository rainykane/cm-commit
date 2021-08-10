const axios = require('axios'); 

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36';

axios.interceptors.request.use(function(config) {
  config.headers = {
    ...config.headers,
    Cookie: global.cookie || '',
    'User-Agent': UA,
  }
  return config;
}, function (error) {
  return Promise.reject(error);
})

const HOST = 'https://www.tapd.cn';

// 获取我的代办cartId
const getCartList = () => axios.get(`${HOST}/my_dashboard/ajax_get_card_list/1`, { headers: { Referer: 'https://www.tapd.cn/my_dashboard?left_tree=1' }});

// 获取我的代办详情
const getCartDetail =  (id) => axios.post(`${HOST}/my_dashboard/ajax_get_card_detail/${id}`);

module.exports = {
  getCartList,
  getCartDetail,
  UA
}