import Vue from 'vue'
import App from './App'
import router from './router'

import YUEUI from '../packages/index'
import demoBlock from './components/demo-block.vue'
Vue.component('demo-block', demoBlock)

Vue.use(YUEUI)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  render: h => h(App)
})
