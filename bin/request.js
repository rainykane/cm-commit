const axios = require('axios'); 
const qs = require('qs');
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
const postHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
}

// 获取我的代办cartId
const getCartList = () => axios.get(`${HOST}/my_dashboard/ajax_get_card_list/1`, { headers: { Referer: 'https://www.tapd.cn/my_dashboard?left_tree=1' }});

// 获取我的代办详情
const getCartDetail =  (id) => axios.post(`${HOST}/my_dashboard/ajax_get_card_detail/${id}`);

// 获取需求短链
const getShortUrl = (id, longUrl) => axios.post(`${HOST}/${id}/short_url/generate_short_url/`, qs.stringify({ orginal_long_url: longUrl }), { headers: { ...postHeaders } });

module.exports = {
  getCartList,
  getCartDetail,
  getShortUrl,
  UA
}