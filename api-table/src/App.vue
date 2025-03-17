<script setup>
import intro from "./introConfig.js";
import html2canvas from 'html2canvas'
import { ElMessage, ElMessageBox } from 'element-plus';
import { handleParse } from './parse.js'
import { onMounted, reactive, ref, watch, computed, nextTick } from 'vue';

import { createClient } from '@supabase/supabase-js'

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ2ZtcHFvYnJ1bmJieXlqd2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNjkxNTksImV4cCI6MjA1Njc0NTE1OX0.gjbyDyQZ3_ZfygW4TNTktjSGWtLhQHsBRtQo55DytRw'

const SUPABASE_URL = "https://jcgfmpqobrunbbyyjwhp.supabase.co"
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const initMonthIn = async () => {
  const timestamp = new Date()
  const todayIsGet = localStorage.getItem("lastGetNumber")
  // 用户初次访问或到了第二天，增加一个访问量
  if (!todayIsGet || timestamp.getTime() >= todayIsGet) {
    // 月访问量 + 1
    let { data: month_in, error } = await supabase
      .from('month_in')
      .select('in_num')
      .eq('month', parseInt(new Date().getMonth()) + 1)
    const { data, error2 } = await supabase
      .from('month_in')
      .update({ in_num: month_in[0].in_num + 1 })
      .eq('month', parseInt(new Date().getMonth()) + 1)
      .select()
    localStorage.setItem("number_inner", month_in[0].in_num + 1)
    localStorage.setItem("lastGetNumber", timestamp.getTime() + (24 * 60 * 60 * 1000))
  }
  const nn = localStorage.getItem("number_inner")
  monthInNumber.value = nn && parseInt(nn)

  // 当日已访问用户，且未超过一天
  if (todayIsGet && timestamp.getTime() < todayIsGet) return
}

// TODO
// 生成图片
const generateTableImg = async () => {
  const tableContainer = document.querySelector('.table-x')
  const tableElement = document.querySelector('.table')

  // 保存原始滚动位置
  const originalScrollLeft = tableContainer.scrollLeft;
  const originalScrollTop = tableContainer.scrollTop;

  // 创建一个临时容器来放置表格
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px'; // 将临时容器移到屏幕外
  tempContainer.style.width = `${tableElement.scrollWidth}px`; // 设置临时容器宽度为表格的实际宽度
  tempContainer.style.height = `${tableElement.scrollHeight}px`; // 设置临时容器高度为表格的实际高度
  document.body.appendChild(tempContainer);

  // 将表格移动到临时容器中
  tempContainer.appendChild(tableElement);

  // 使用 html2canvas 捕获表格
  try {
    const canvas = await html2canvas(tableElement, {
      width: tableElement.scrollWidth, // 设置宽度为表格的实际宽度
      height: tableElement.scrollHeight, // 设置高度为表格的实际高度
      scale: 2, // 提高导出图片的分辨率
      useCORS: true, // 允许跨域资源
      allowTaint: true, // 允许加载外部图片
      logging: true, // 开启日志（可选）
    });

    // 将 canvas 转换为图片并下载
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'table-export.png'; // 下载文件名
    link.click();
  } catch (err) {
    console.error('导出失败:', err);
  } finally {
    // 将表格移回原始容器
    tableContainer.appendChild(tableElement);
    // 恢复原始滚动位置
    tableContainer.scrollLeft = originalScrollLeft;
    tableContainer.scrollTop = originalScrollTop;
    // 移除临时容器
    document.body.removeChild(tempContainer);
  }
}

const loading = ref(false)
const setVisable = ref(false)
const innerVisible = ref(true)
const enableEdit = ref(false)
const importDialogVisable = ref(false)

const monthInNumber = ref(0)

const viewList = ['log', 'preview', 'result']
// 视图切换
const turnView = ref('preview')
// 是否解析
const played = ref(false)

// 新手引导
const beginGuide = () => {
  if (!intro) return
  intro.setOptions({
    steps: [
      {
        element: step1.value, // 定位到相应的元素位置，如果不设置element，则默认展示在屏幕中央
        title: '待解析HTML', // 标题
        intro: '将Swagger网页的源码复制进文本框' // 内容
      },
      {
        element: step2.value,
        intro: '在此处你可以看到将要抽取的源数据'
      },
      {
        element: step3.value,
        intro: `
        <p>点击可切换当前视图，视图包括“预览视图”、“日志视图”和“解析视图”</p>
        <p>预览视图：显示文本数据的源代码格式。</p>
        <p>日志视图：显示解析程序处理过程，可展示错误，反馈bug。</p>
        <p>解析视图：解析后的表格，可通过“设置”来改变解析样式。</p>`
      },
      {
        element: step4.value,
        intro: `对解析结果的样式进行自定义，也可导入快速配置。`
      },
      {
        element: step5.value,
        intro: `点击“开始解析”按钮一键生成接口设计表吧！`
      },
    ],
    tooltipClass: 'customTooltip'
  });
  nextTick(() => {
    intro.start();
  })
}
const step1 = ref(null)
const step2 = ref(null)
const step3 = ref(null)
const step4 = ref(null)
const step5 = ref(null)

const defalutTheme = {
  name: '默认',
  options: {
    columnWidth: {},
    tableThList: {},
    columnShow: {},
    splitRow: true,
    columnBorder: true,
    table: {
      borderLeftStyle: 'none',
      borderLeftWidth: '1px',
      borderRightStyle: 'none',
      borderRightWidth: '1px',
      borderTopStyle: 'solid',
      borderTopWidth: '2px',
      borderBottomStyle: 'solid',
      borderBottomWidth: '2px',
    },
    th: {
      fontWeight: 'bold',
    },
    tr: {
      minHeight: '30px',
    },
    td: {
      padding: '8px',
      textAlign: 'center',
      justifyContent: 'center'
    }
  },
  create_time: new Date()
}
// 日志
const logs = ref([])

const htmlText = ref(`<div class="wrapper"><section class="block col-12 block-desktop col-12-desktop"><div><span><div class="opblock-tag-section"><h4 class="opblock-tag" id="operations-tag-任务管理" data-tag="任务管理" data-is-open="false"><a class="nostyle" href="#/任务管理"><span>任务管理</span></a><small><div class="markdown"><p>Task Controller</p>
</div></small><div></div><button class="expand-operation" title="Expand operation"><svg class="arrow" width="20" height="20"><use href="#large-arrow" xlink:href="#large-arrow"></use></svg></button></h4><noscript></noscript></div></span><span><div class="opblock-tag-section is-open"><h4 class="opblock-tag" id="operations-tag-指标体系管理" data-tag="指标体系管理" data-is-open="true"><a class="nostyle" href="#/指标体系管理"><span>指标体系管理</span></a><small><div class="markdown"><p>Form Entry Controller</p>
</div></small><div></div><button class="expand-operation" title="Collapse operation"><svg class="arrow" width="20" height="20"><use href="#large-arrow-down" xlink:href="#large-arrow-down"></use></svg></button></h4><div class="no-margin"><!-- react-text: 27610 --> <!-- /react-text --><span><div class="opblock opblock-get is-open" id="operations-指标体系管理-getAllFormEntryUsingGET"><div class="opblock-summary opblock-summary-get"><span class="opblock-summary-method">GET</span><span class="opblock-summary-path" data-path="/api/form_entry"><a class="nostyle" href="#/指标体系管理/getAllFormEntryUsingGET"><span>​/api​/form_entry</span></a></span><div class="opblock-summary-description">获取指标体系列表</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 27622 --></div><div class="no-margin"><!-- react-text: 30941 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>获取指标体系列表</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="key" data-param-in="query"><td class="parameters-col_name"><div class="parameter__name"><!-- react-text: 30963 -->key<!-- /react-text --></div><div class="parameter__type"><!-- react-text: 30965 -->string<!-- /react-text --></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30968 -->(<!-- /react-text --><!-- react-text: 30969 -->query<!-- /react-text --><!-- react-text: 30970 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>关键词搜索</p>
</div><input type="text" class="" title="" placeholder="key - 关键词搜索" disabled="" value=""></td></tr><tr data-param-name="page_num" data-param-in="query"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30977 -->page_num<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30980 -->integer<!-- /react-text --><span class="prop-format"><!-- react-text: 30982 -->($<!-- /react-text --><!-- react-text: 30983 -->int32<!-- /react-text --><!-- react-text: 30984 -->)<!-- /react-text --></span></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30987 -->(<!-- /react-text --><!-- react-text: 30988 -->query<!-- /react-text --><!-- react-text: 30989 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>当前页码</p>
</div><input type="text" class="" title="" placeholder="page_num - 当前页码" disabled="" value="1"></td></tr><tr data-param-name="page_size" data-param-in="query"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30996 -->page_size<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30999 -->integer<!-- /react-text --><span class="prop-format"><!-- react-text: 31001 -->($<!-- /react-text --><!-- react-text: 31002 -->int32<!-- /react-text --><!-- react-text: 31003 -->)<!-- /react-text --></span></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 31006 -->(<!-- /react-text --><!-- react-text: 31007 -->query<!-- /react-text --><!-- react-text: 31008 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>每页条数</p>
</div><input type="text" class="" title="" placeholder="page_size - 每页条数" disabled="" value="10"></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 31058 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-post is-open" id="operations-指标体系管理-createFormEntryUsingPOST"><div class="opblock-summary opblock-summary-post"><span class="opblock-summary-method">POST</span><span class="opblock-summary-path" data-path="/api/form_entry"><a class="nostyle" href="#/指标体系管理/createFormEntryUsingPOST"><span>​/api​/form_entry</span></a></span><div class="opblock-summary-description">新建指标体系列表</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 27635 --></div><div class="no-margin"><!-- react-text: 30838 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>新建指标体系列表</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="formEntry" data-param-in="body"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30860 -->formEntry<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30863 -->object<!-- /react-text --></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30866 -->(<!-- /react-text --><!-- react-text: 30867 -->body<!-- /react-text --><!-- react-text: 30868 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>formEntry</p>
</div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div class="body-param" data-param-name="formEntry" data-param-in="body"><div class="highlight-code"><pre class="body-param__example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"formBody"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="token-not-formatted">
    </span><span class="token-string">"targets"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">[</span><span class="token-not-formatted">
      </span><span class="">{</span><span class="token-not-formatted">
        </span><span class="token-string">"children"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">[</span><span class="token-not-formatted">
          </span><span class="">null</span><span class="token-not-formatted">
        </span><span class="">]</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"description"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"name"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"result"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"score"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"type"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="token-not-formatted">
      </span><span class="">}</span><span class="token-not-formatted">
    </span><span class="">]</span><span class="token-not-formatted">
  </span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"formName"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div><div class="body-param-options"><label for=""><span>Parameter content type</span><div class="content-type-wrapper body-param-content-type"><select class="content-type"><option value="application/json">application/json</option></select></div></label></div></div></div></div></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="201"><td class="response-col_status">201</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Created</p>
</div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30937 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-get is-open" id="operations-指标体系管理-getFormEntryByIdUsingGET"><div class="opblock-summary opblock-summary-get"><span class="opblock-summary-method">GET</span><span class="opblock-summary-path" data-path="/api/form_entry/{id}"><a class="nostyle" href="#/指标体系管理/getFormEntryByIdUsingGET"><span>​/api​/form_entry​/{id}</span></a></span><div class="opblock-summary-description">获取指标体系列表</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 27648 --></div><div class="no-margin"><!-- react-text: 30752 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>获取指标体系列表</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="id" data-param-in="path"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30774 -->id<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30777 -->integer<!-- /react-text --><span class="prop-format"><!-- react-text: 30779 -->($<!-- /react-text --><!-- react-text: 30780 -->int32<!-- /react-text --><!-- react-text: 30781 -->)<!-- /react-text --></span></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30784 -->(<!-- /react-text --><!-- react-text: 30785 -->path<!-- /react-text --><!-- react-text: 30786 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>id</p>
</div><input type="text" class="" title="" placeholder="id - id" disabled="" value=""></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30836 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-put is-open" id="operations-指标体系管理-updateFormEntryUsingPUT"><div class="opblock-summary opblock-summary-put"><span class="opblock-summary-method">PUT</span><span class="opblock-summary-path" data-path="/api/form_entry/{id}"><a class="nostyle" href="#/指标体系管理/updateFormEntryUsingPUT"><span>​/api​/form_entry​/{id}</span></a></span><div class="opblock-summary-description">更新指标体系</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 27661 --></div><div class="no-margin"><!-- react-text: 30633 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="formEntry" data-param-in="body"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30652 -->formEntry<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30655 -->object<!-- /react-text --></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30658 -->(<!-- /react-text --><!-- react-text: 30659 -->body<!-- /react-text --><!-- react-text: 30660 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>formEntry</p>
</div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div class="body-param" data-param-name="formEntry" data-param-in="body"><div class="highlight-code"><pre class="body-param__example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"formBody"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="token-not-formatted">
    </span><span class="token-string">"targets"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">[</span><span class="token-not-formatted">
      </span><span class="">{</span><span class="token-not-formatted">
        </span><span class="token-string">"children"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">[</span><span class="token-not-formatted">
          </span><span class="">null</span><span class="token-not-formatted">
        </span><span class="">]</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"description"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"name"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"result"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"score"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
        </span><span class="token-string">"type"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="token-not-formatted">
      </span><span class="">}</span><span class="token-not-formatted">
    </span><span class="">]</span><span class="token-not-formatted">
  </span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"formName"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div><div class="body-param-options"><label for=""><span>Parameter content type</span><div class="content-type-wrapper body-param-content-type"><select class="content-type"><option value="application/json">application/json</option></select></div></label></div></div></div></div></td></tr><tr data-param-name="id" data-param-in="path"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30681 -->id<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30684 -->integer<!-- /react-text --><span class="prop-format"><!-- react-text: 30686 -->($<!-- /react-text --><!-- react-text: 30687 -->int32<!-- /react-text --><!-- react-text: 30688 -->)<!-- /react-text --></span></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30691 -->(<!-- /react-text --><!-- react-text: 30692 -->path<!-- /react-text --><!-- react-text: 30693 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>id</p>
</div><input type="text" class="" title="" placeholder="id - id" disabled="" value=""></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="201"><td class="response-col_status">201</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Created</p>
</div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30748 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-delete is-open" id="operations-指标体系管理-delFormEntryUsingDELETE"><div class="opblock-summary opblock-summary-delete"><span class="opblock-summary-method">DELETE</span><span class="opblock-summary-path" data-path="/api/form_entry/{id}"><a class="nostyle" href="#/指标体系管理/delFormEntryUsingDELETE"><span>​/api​/form_entry​/{id}</span></a></span><div class="opblock-summary-description">根据id删除指标体系列表</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 27674 --></div><div class="no-margin"><!-- react-text: 30547 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>根据id删除指标体系列表</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="id" data-param-in="path"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30569 -->id<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30572 -->integer<!-- /react-text --><span class="prop-format"><!-- react-text: 30574 -->($<!-- /react-text --><!-- react-text: 30575 -->int32<!-- /react-text --><!-- react-text: 30576 -->)<!-- /react-text --></span></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30579 -->(<!-- /react-text --><!-- react-text: 30580 -->path<!-- /react-text --><!-- react-text: 30581 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>id</p>
</div><input type="text" class="" title="" placeholder="id - id" disabled="" value=""></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="204"><td class="response-col_status">204</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>No Content</p>
</div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30631 --> <!-- /react-text --></div></div></span><!-- react-text: 27761 --> <!-- /react-text --></div></div></span><span><div class="opblock-tag-section is-open"><h4 class="opblock-tag" id="operations-tag-用户" data-tag="用户" data-is-open="true"><a class="nostyle" href="#/用户"><span>用户</span></a><small><div class="markdown"><p>User Controller</p>
</div></small><div></div><button class="expand-operation" title="Collapse operation"><svg class="arrow" width="20" height="20"><use href="#large-arrow-down" xlink:href="#large-arrow-down"></use></svg></button></h4><div class="no-margin"><!-- react-text: 24947 --> <!-- /react-text --><span><div class="opblock opblock-put is-open" id="operations-用户-createUserUsingPUT"><div class="opblock-summary opblock-summary-put"><span class="opblock-summary-method">PUT</span><span class="opblock-summary-path" data-path="/api/user"><a class="nostyle" href="#/用户/createUserUsingPUT"><span>​/api​/user</span></a></span><div class="opblock-summary-description">修改信息</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 24959 --></div><div class="no-margin"><!-- react-text: 30444 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>更新用户的信息</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="user" data-param-in="body"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30466 -->user<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30469 -->object<!-- /react-text --></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30472 -->(<!-- /react-text --><!-- react-text: 30473 -->body<!-- /react-text --><!-- react-text: 30474 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>user</p>
</div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div class="body-param" data-param-name="user" data-param-in="body"><div class="highlight-code"><pre class="body-param__example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"fullname"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"new_password"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"password"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"roleId"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"username"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div><div class="body-param-options"><label for=""><span>Parameter content type</span><div class="content-type-wrapper body-param-content-type"><select class="content-type"><option value="application/json">application/json</option></select></div></label></div></div></div></div></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="201"><td class="response-col_status">201</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Created</p>
</div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30543 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-patch is-open" id="operations-用户-updateAvatarUsingPATCH"><div class="opblock-summary opblock-summary-patch"><span class="opblock-summary-method">PATCH</span><span class="opblock-summary-path" data-path="/api/user/avatar"><a class="nostyle" href="#/用户/updateAvatarUsingPATCH"><span>​/api​/user​/avatar</span></a></span><div class="opblock-summary-description">修改用户头像</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 24972 --></div><div class="no-margin"><!-- react-text: 30342 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>修改用户头像</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="avatar" data-param-in="body"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30364 -->avatar<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30367 -->string<!-- /react-text --><span class="prop-format"><!-- react-text: 30369 -->($<!-- /react-text --><!-- react-text: 30370 -->binary<!-- /react-text --><!-- react-text: 30371 -->)<!-- /react-text --></span></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30374 -->(<!-- /react-text --><!-- react-text: 30375 -->body<!-- /react-text --><!-- react-text: 30376 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>avatar</p>
</div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div class="body-param" data-param-name="avatar" data-param-in="body"><div class="highlight-code"><pre class="body-param__example microlight"><span class="">string</span></pre></div><div class="body-param-options"><label for=""><span>Parameter content type</span><div class="content-type-wrapper body-param-content-type"><select class="content-type"><option value="multipart/form-data">multipart/form-data</option></select></div></label></div></div></div></div></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="204"><td class="response-col_status">204</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>No Content</p>
</div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30440 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-post is-open" id="operations-用户-loginUsingPOST"><div class="opblock-summary opblock-summary-post"><span class="opblock-summary-method">POST</span><span class="opblock-summary-path" data-path="/api/user/login"><a class="nostyle" href="#/用户/loginUsingPOST"><span>​/api​/user​/login</span></a></span><div class="opblock-summary-description">用户登录</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 24985 --></div><div class="no-margin"><!-- react-text: 30239 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-description-wrapper"><div class="opblock-description"><div class="markdown"><p>通过用户名和密码进行登录</p>
</div></div></div><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="table-container"><table class="parameters"><thead><tr><th class="col_header parameters-col_name">Name</th><th class="col_header parameters-col_description">Description</th></tr></thead><tbody><tr data-param-name="request" data-param-in="body"><td class="parameters-col_name"><div class="parameter__name required"><!-- react-text: 30261 -->request<!-- /react-text --><span>&nbsp;*</span></div><div class="parameter__type"><!-- react-text: 30264 -->object<!-- /react-text --></div><div class="parameter__deprecated"></div><div class="parameter__in"><!-- react-text: 30267 -->(<!-- /react-text --><!-- react-text: 30268 -->body<!-- /react-text --><!-- react-text: 30269 -->)<!-- /react-text --></div></td><td class="parameters-col_description"><div class="markdown"><p>request</p>
</div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div class="body-param" data-param-name="request" data-param-in="body"><div class="highlight-code"><pre class="body-param__example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"password"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"username"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div><div class="body-param-options"><label for=""><span>Parameter content type</span><div class="content-type-wrapper body-param-content-type"><select class="content-type"><option value="application/json">application/json</option></select></div></label></div></div></div></div></td></tr></tbody></table></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="201"><td class="response-col_status">201</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Created</p>
</div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30338 --> <!-- /react-text --></div></div></span><span><div class="opblock opblock-get is-open" id="operations-用户-getInfoUsingGET"><div class="opblock-summary opblock-summary-get"><span class="opblock-summary-method">GET</span><span class="opblock-summary-path" data-path="/api/user/stat"><a class="nostyle" href="#/用户/getInfoUsingGET"><span>​/api​/user​/stat</span></a></span><div class="opblock-summary-description">获取用户个人信息</div><button class="authorization__btn unlocked" aria-label="authorization button unlocked"><svg width="20" height="20"><use href="#unlocked" xlink:href="#unlocked"></use></svg></button><!-- react-empty: 24998 --></div><div class="no-margin"><!-- react-text: 30180 --> <!-- /react-text --><div class="opblock-body"><div class="opblock-section"><div class="opblock-section-header"><div class="tab-header"><h4 class="opblock-title">Parameters</h4></div><div class="try-out"><button class="btn try-out__btn">Try it out </button></div></div><div class="parameters-container"><div class="opblock-description-wrapper"><p>No parameters</p></div></div></div><div class="execute-wrapper"></div><div class="responses-wrapper"><div class="opblock-section-header"><h4>Responses</h4><label><span>Response content type</span><div class="content-type-wrapper execute-content-type"><select class="content-type"><option value="*/*">*/*</option></select></div></label></div><div class="responses-inner"><table class="responses-table"><thead><tr class="responses-header"><td class="col_header response-col_status">Code</td><td class="col_header response-col_description">Description</td></tr></thead><tbody><tr class="response " data-code="200"><td class="response-col_status">200</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>OK</p>
</div></div><div class="model-example"><ul class="tab"><li class="tabitem active"><a class="tablinks" data-name="example">Example Value</a></li><li class="tabitem"><a class="tablinks" data-name="model">Model</a></li></ul><div><div><div class="highlight-code"><pre class="example microlight"><span class="">{</span><span class="token-not-formatted">
  </span><span class="token-string">"code"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"currentPage"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"data"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="">{</span><span class="">}</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"message"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-string">"string"</span><span class="">,</span><span class="token-not-formatted">
  </span><span class="token-string">"total"</span><span class="">:</span><span class="token-not-formatted"> </span><span class="token-not-formatted">0</span><span class="token-not-formatted">
</span><span class="">}</span></pre></div></div></div></div></td></tr><tr class="response " data-code="401"><td class="response-col_status">401</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Unauthorized</p>
</div></div></td></tr><tr class="response " data-code="403"><td class="response-col_status">403</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Forbidden</p>
</div></div></td></tr><tr class="response " data-code="404"><td class="response-col_status">404</td><td class="response-col_description"><div class="response-col_description__inner"><div class="markdown"><p>Not Found</p>
</div></div></td></tr></tbody></table></div></div></div><!-- react-text: 30237 --> <!-- /react-text --></div></div></span><!-- react-text: 25000 --> <!-- /react-text --></div></div></span><span><div class="opblock-tag-section"><h4 class="opblock-tag" id="operations-tag-管理员" data-tag="管理员" data-is-open="false"><a class="nostyle" href="#/管理员"><span>管理员</span></a><small><div class="markdown"><p>Admin Controller</p>
</div></small><div></div><button class="expand-operation" title="Expand operation"><svg class="arrow" width="20" height="20"><use href="#large-arrow" xlink:href="#large-arrow"></use></svg></button></h4><noscript></noscript></div></span><span><div class="opblock-tag-section"><h4 class="opblock-tag" id="operations-tag-零部件制造商管理" data-tag="零部件制造商管理" data-is-open="false"><a class="nostyle" href="#/零部件制造商管理"><span>零部件制造商管理</span></a><small><div class="markdown"><p>Manufacturer Controller</p>
</div></small><div></div><button class="expand-operation" title="Expand operation"><svg class="arrow" width="20" height="20"><use href="#large-arrow" xlink:href="#large-arrow"></use></svg></button></h4><noscript></noscript></div></span><span><div class="opblock-tag-section"><h4 class="opblock-tag" id="operations-tag-飞机零部件类型管理" data-tag="飞机零部件类型管理" data-is-open="false"><a class="nostyle" href="#/飞机零部件类型管理"><span>飞机零部件类型管理</span></a><small><div class="markdown"><p>Part Class Controller</p>
</div></small><div></div><button class="expand-operation" title="Expand operation"><svg class="arrow" width="20" height="20"><use href="#large-arrow" xlink:href="#large-arrow"></use></svg></button></h4><noscript></noscript></div></span></div></section></div>
`)

watch(htmlText, (newV) => {
  played.value = false
})

const computeWidth = computed(() => {
  let sum = 0
  const list = currentTheme.options.columnShow
  const obj = []
  for (const key in list) {
    const val = list[key]
    if (val) {
      obj.push(key)
      continue
    }
  }
  obj.forEach(key => {
    const width = parseFloat(currentTheme.options.columnWidth[key]);
    sum += (width ? width : 0)
  })
  return sum ? sum : 'auto'
})

const tables = ref([])
const align = {
  'center': '居中',
  'left': '左对齐',
  'right': '右对齐'
}
const valign = {
  'start': '顶部对齐',
  'center': '居中',
  'end': '底部对齐'
}
const borderStyle = {
  'none': '无边框',
  'solid': '实线',
  'dashed': '虚线'
}

const themes = reactive({})
const theme_list = ref([])

// 当前主题
const currentTheme = reactive({})

// 添加主题，可以判断重复
const handleSaveTheme = (theme) => {
  let themes = localStorage.getItem('themes')
  const themes_parsed = JSON.parse(themes)
  JSON.parse(themes).forEach((item, index) => {
    if (item.name === theme.name) {
      ElMessageBox.confirm('请确认是否将此次配置覆盖原有配置', '检测到重复配置名', {
        confirmButtonText: '确认覆盖',
        cancelButtonText: '取消',
        type: 'error',
      }).then((res) => {
        themes_parsed.splice(index, 1)
        localStorage.removeItem('themes')
        ElMessage.success("配置已更新")
      }).catch(() => {
        return false
      })
    }
  })
  localStorage.removeItem('themes')
  themes_parsed.push({ ...theme, create_time: new Date() })
  localStorage.setItem('themes', JSON.stringify(themes_parsed))
  return true
}

// 保存配置
const saveTheme = () => {
  ElMessageBox.prompt('请为此配置命名（提示：保存后下次访问时仍然可以使用此配置，不保存配置并不会丢失在本次访问中已修改的样式）', '保存配置', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputValue: currentTheme.name,
  }).then(async ({ value }) => {
    currentTheme.name = value
    const isSave = await handleSaveTheme(currentTheme)
    if (!isSave) {
      throw new Error()
    }
    else {
      ElMessage.success("配置已保存")
    }
  }).catch(() => {
    ElMessage.warning("配置项未保存")
  })
}
const deleteTheme = (name) => {
  if (name === "默认") {
    ElMessage.warning("默认配置无法删除")
    return
  };
  let _themes = localStorage.getItem('themes')
  const themes_parsed = JSON.parse(_themes)
  JSON.parse(_themes).forEach((item, index) => {
    if (item.name === name) {
      themes_parsed.splice(index, 1)
      localStorage.removeItem('themes')
      ElMessage.success("配置已更新")
    }
  })
  localStorage.setItem('themes', JSON.stringify(themes_parsed))
  getAllThemes()
}
const getAllThemes = () => {
  // 初始化模板仓库
  let _themes = localStorage.getItem('themes');
  // 必须要有默认主题
  if (!_themes) {
    localStorage.setItem('themes', JSON.stringify([defalutTheme]));
    _themes = localStorage.getItem('themes');
  }
  // 拿所有主题
  const arrs = JSON.parse(_themes)
  // 按时间排序
  arrs.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
  const themes_temp = {}
  theme_list.value.splice(0)
  arrs.forEach(theme => {
    theme_list.value.push(theme.name)
    themes_temp[theme.name] = theme.options
  })
  Object.assign(themes, themes_temp)
  return themes_temp
}

const initTheme = () => {
  getAllThemes()
  const data = { name: theme_list.value[theme_list.value.length - 1] + '（副本）', options: themes[theme_list.value[theme_list.value.length - 1]] }
  Object.assign(currentTheme, data)
}

// 打开设置弹窗
const openSetting = () => {
  setVisable.value = true
}
const openImportDialogVisable = () => {
  importDialogVisable.value = true
  getAllThemes()
}
// 显示/隐藏左侧输入区域
const handleLeftVisable = () => {
  innerVisible.value = !innerVisible.value;
  nextTick(() => {
    resizeColumnWidth(tables.value)
  })
}

// 动态调整列宽
const resizeColumnWidth = (tale) => {
  const table_x_el = document.querySelector(".table-x")
  const num = Object.values(currentTheme.options.columnShow).filter(i => i).length
  if (Object.keys(tale).length === 0) {
    return
  }
  Object.keys(tale[0][0]).forEach((item) => {
    if (table_x_el) {
      currentTheme.options.columnWidth[item] = (table_x_el.clientWidth - 16) / num
    } else {
      currentTheme.options.columnWidth[item] = ''
    }
  })
}

// 解析HTML！！！！
const parseHtml = () => {
  if (!played.value) {
    played.value = true
  }
  try {
    // 切换至解析视图
    turnView.value = 'result'
    // 清空解析表
    tables.value.splice(0)
    loading.value = true

    // 文本输入不为空
    if (htmlText.value.trim() === '') {
      throw new Error('请输入HTML内容')
    }

    const html = htmlText.value
    const tale = handleParse(html)
    Object.keys(tale[0][0]).forEach((item) => {
      // 初始化表头别名
      currentTheme.options.tableThList[item] = item
      // 初始化本列是否显示
      currentTheme.options.columnShow[item] = true
    })
    tale.forEach((item) => {
      tables.value.push(item)
    })
    nextTick(() => {
      // 初始化列宽
      resizeColumnWidth(tale)
    })
    loading.value = false
  } catch (error) {
    if (played.value) {
      played.value = false
    }
    ElMessage.error(error.message)
    loading.value = false
  }
}
const compute = (num) => {
  switch (num) {
    case 0:
      return currentTheme.options.columnWidth['接口名称']
    case 1:
      return currentTheme.options.columnWidth['请求方法']
    case 2:
      return currentTheme.options.columnWidth['请求地址']
    case 3:
      return currentTheme.options.columnWidth['请求参数']
    case 4:
      return currentTheme.options.columnWidth['返回结果']
  }
}

// 初始化主题
initTheme()

onMounted(() => {
  window.onresize = () => {
    resizeColumnWidth(tables.value)
  }

  initMonthIn()
})
</script>

<template>
  <main v-loading="loading">
    <div class="bg">
      <img src="@/assets/bg.png" alt="">
    </div>
    <!-- 左侧输入区 -->
    <div class="left" :style="{ width: innerVisible ? '40%' : '0px' }">
      <textarea ref="step1" v-model="htmlText" placeholder="在此输入您的HTML"></textarea>
      <div class="opts">
        <button @click="beginGuide" class="no-mobile">新手指引</button>
        <button @click="handleLeftVisable" class="no-mobile">隐藏</button>
        <button class="danger" @click="htmlText = ''">清空</button>
        <button ref="step4" class="primary" @click="openSetting">设置</button>
        <!-- 开始解析 -->
        <button ref="step5" class="primary" :style="{ backgroundColor: !played ? '#252376' : '#2F7623' }"
          :disabled="loading || played" @click="parseHtml">{{ !played ? '开始' : '已' }}解析</button>
        <!-- <button @click="generateTableImg">导出图片</button> -->
      </div>
    </div>

    <!-- 右侧表格 -->
    <div class="right">
      <div class="title">
        {{ (turnView === 'preview' && '预览') || (turnView === 'result' && '解析') || (turnView === 'log' && '日志') }}视图
        <div class="turn">
          <el-popover placement="left">
            <template #reference>
              <svg ref="step3" width="20px" height="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                <path
                  d="M384 96a32 32 0 0 1 64 0v786.752a32 32 0 0 1-54.592 22.656L95.936 608a32 32 0 0 1 0-45.312h.128a32 32 0 0 1 45.184 0L384 805.632zm192 45.248a32 32 0 0 1 54.592-22.592L928.064 416a32 32 0 0 1 0 45.312h-.128a32 32 0 0 1-45.184 0L640 218.496V928a32 32 0 1 1-64 0V141.248z">
                </path>
              </svg>
            </template>
            <div>
              <!-- 点击切换到“{{ !turnView ? '预览' : '解析' }}”视图 -->
              <el-radio-group v-model="turnView">
                <el-radio :value="'preview'">预览视图</el-radio>
                <el-radio :value="'log'">日志视图</el-radio>
                <el-radio :value="'result'">解析视图</el-radio>
              </el-radio-group>
            </div>
          </el-popover>
        </div>
        <div class="number">{{ monthInNumber }}</div>
      </div>
      <div class="html" id="log" v-show="turnView == 'log'"></div>
      <div ref="step2" class="html" v-show="turnView == 'preview'">
        <div v-html="htmlText"></div>
      </div>
      <div class="table-x" v-show="turnView == 'result'">
        <img class="empty" v-if="tables.length === 0" src="./assets/empty.png" alt="">
        <div class="table" :style="{ ...currentTheme.options.table, width: computeWidth + 'px' }"
          v-for="(table, index) in tables" :key="index">
          <!-- 表头列 -->
          <div class="tr" :style="{ ...currentTheme.options.tr, ...currentTheme.options.th }">
            <div :class="{ 'td': true, 'column-border': currentTheme.options.columnBorder }"
              v-for="(th, key, ii) in currentTheme.options.tableThList" v-show="currentTheme.options.columnShow[key]"
              :style="{ ...currentTheme.options.td, width: compute(ii) + 'px' }" :key="th">{{ th }}</div>
          </div>
          <!-- 表格体 -->
          <div v-for="(val, key) in table" class="tr" :style="currentTheme.options.tr">
            <div :class="{ 'td': true, 'column-border': currentTheme.options.columnBorder }"
              v-for="(_, k, ii) in currentTheme.options.tableThList" v-show="currentTheme.options.columnShow[k]"
              :key="k" :style="{ ...currentTheme.options.td, width: compute(ii) + 'px' }">
              <template v-if="!enableEdit">
                <template v-if="currentTheme.options.splitRow && k === '请求参数'">
                  <div class="td-vertical-x">
                    <div class="td" v-if="val[k].split(',').length === 0">-</div>
                    <div class="td" v-else v-for="p in val[k].split(',')">{{ p }}</div>
                  </div>
                </template>
                <template v-else>
                  {{ val[k] }}
                </template>
              </template>
              <el-input type="textarea" v-else v-model="val[k]"></el-input>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- 左侧输入区折叠按钮-->
    <div class="show-left" @click="handleLeftVisable" v-show="!innerVisible">
      <div class="btn">
        <span>展开</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
          <path
            d="M452.864 149.312a29.12 29.12 0 0 1 41.728.064L826.24 489.664a32 32 0 0 1 0 44.672L494.592 874.624a29.12 29.12 0 0 1-41.728 0 30.592 30.592 0 0 1 0-42.752L764.736 512 452.864 192a30.592 30.592 0 0 1 0-42.688m-256 0a29.12 29.12 0 0 1 41.728.064L570.24 489.664a32 32 0 0 1 0 44.672L238.592 874.624a29.12 29.12 0 0 1-41.728 0 30.592 30.592 0 0 1 0-42.752L508.736 512 196.864 192a30.592 30.592 0 0 1 0-42.688z">
          </path>
        </svg>
      </div>
    </div>

    <!-- 配置面板 -->
    <div class="set-pannel" :style="{ left: setVisable ? '0' : 'min(-300px,-40%)' }">
      <div class="close">
        <h2>{{ currentTheme.name }}</h2>
        <span @click="setVisable = false">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
            <path
              d="M764.288 214.592 512 466.88 259.712 214.592a31.936 31.936 0 0 0-45.12 45.12L466.752 512 214.528 764.224a31.936 31.936 0 1 0 45.12 45.184L512 557.184l252.288 252.288a31.936 31.936 0 0 0 45.12-45.12L557.12 512.064l252.288-252.352a31.936 31.936 0 1 0-45.12-45.184z">
            </path>
          </svg>
        </span>
      </div>
      <div class="content">
        <div class="item-x">
          <div class="name">表格</div>
          <div class="opt">
            <div class="item">
              <div class="n">上框线</div>
              <div class="b">
                <el-select v-model="currentTheme.options.table.borderTopStyle" placeholder="Select">
                  <el-option v-for="(a, k) in borderStyle" :key="a" :label="a" :value="k" />
                </el-select>
                <el-input :disabled="currentTheme.options.table.borderTopStyle === 'none'"
                  v-model="currentTheme.options.table.borderTopWidth" placeholder="Please input" />
              </div>
            </div>
            <div class="item">
              <div class="n">下框线</div>
              <div class="b">
                <el-select v-model="currentTheme.options.table.borderBottomStyle" placeholder="Select">
                  <el-option v-for="(a, k) in borderStyle" :key="a" :label="a" :value="k" />
                </el-select>
                <el-input :disabled="currentTheme.options.table.borderBottomStyle === 'none'"
                  v-model="currentTheme.options.table.borderBottomWidth" placeholder="Please input" />
              </div>
            </div>
            <div class="item">
              <div class="n">左框线</div>
              <div class="b">
                <el-select v-model="currentTheme.options.table.borderLeftStyle" placeholder="Select">
                  <el-option v-for="(a, k) in borderStyle" :key="a" :label="a" :value="k" />
                </el-select>
                <el-input :disabled="currentTheme.options.table.borderLeftStyle === 'none'"
                  v-model="currentTheme.options.table.borderLeftWidth" placeholder="Please input" />
              </div>
            </div>
            <div class="item">
              <div class="n">右框线</div>
              <div class="b">
                <el-select v-model="currentTheme.options.table.borderRightStyle" placeholder="Select">
                  <el-option v-for="(a, k) in borderStyle" :key="a" :label="a" :value="k" />
                </el-select>
                <el-input :disabled="currentTheme.options.table.borderRightStyle === 'none'"
                  v-model="currentTheme.options.table.borderRightWidth" placeholder="Please input" />
              </div>
            </div>
            <div class="item">
              <div class="n">启用列间线</div>
              <div class="b">
                <el-switch :active-value="true" :inactive-value="false" v-model="currentTheme.options.columnBorder" />
              </div>
            </div>
            <div class="item">
              <div class="n">拆分行</div>
              <div class="b">
                <el-switch :active-value="true" :inactive-value="false" v-model="currentTheme.options.splitRow" />
              </div>
            </div>
          </div>
        </div>
        <div class="item-x">
          <div class="name">单元格</div>
          <div class="opt">
            <div class="item">
              <div class="n">内边距</div>
              <div class="b">
                <el-input v-model="currentTheme.options.td.padding" class="mx-4" />
              </div>
            </div>
            <div class="item">
              <div class="n">水平对齐方式</div>
              <div class="b">
                <el-select v-model="currentTheme.options.td.textAlign" placeholder="Select">
                  <el-option v-for="(a, k) in align" :key="a" :label="a" :value="k" />
                </el-select>
              </div>
            </div>
            <div class="item">
              <div class="n">垂直对齐方式</div>
              <div class="b">
                <el-select v-model="currentTheme.options.td.justifyContent" placeholder="Select">
                  <el-option v-for="(a, k) in valign" :key="a" :label="a" :value="k" />
                </el-select>
              </div>
            </div>
          </div>
        </div>
        <div class="item-x">
          <div class="name">表头</div>
          <div class="opt">
            <div class="item">
              <div class="n">表头加粗</div>
              <div class="b">
                <el-switch active-value="bold" inactive-value="normal" v-model="currentTheme.options.th.fontWeight" />
              </div>
            </div>
            <div class="item" style="flex-direction: column;">
              <div class="div" v-for="(alia, k) in currentTheme.options.tableThList" :key="k"
                style="width: 100%;display: flex;flex-direction: column;margin-bottom: 10px;border-bottom: 1px solid rgba(0, 0, 0, 0.2);padding-bottom: 10px;">
                <div class="n" style="line-height: 30px;"><span style="color: #000;">配置项</span> {{ k }}</div>
                <div class="b" style="padding-left: 20px;margin-top: 10px;">
                  <span style="line-height: 30px;flex-shrink: 0;">显示：</span>
                  <el-switch :active-value="true" :inactive-value="false" v-model="currentTheme.options.columnShow[k]"
                    @change="resizeColumnWidth(tables)" />
                </div>
                <div class="b" style="padding-left: 20px;margin-top: 10px;">
                  <span style="line-height: 30px;flex-shrink: 0;">别名：</span>
                  <el-input :disabled="!currentTheme.options.columnShow[k]"
                    v-model="currentTheme.options.tableThList[k]"></el-input>
                </div>
                <div class="b" style="padding-left: 20px;margin-top: 10px;">
                  <span style="line-height: 30px;flex-shrink: 0;">列宽：</span>
                  <el-input-number :disabled="!currentTheme.options.columnShow[k]"
                    v-model="currentTheme.options.columnWidth[k]"></el-input-number>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="opts">
        <div>
          启用编辑
          <el-switch :active-value="true" :inactive-value="false" v-model="enableEdit" />
        </div>
        <button style="background-color: #252376;" @click="openImportDialogVisable">选择配置</button>
        <button @click="saveTheme">保存配置</button>
      </div>
    </div>

    <!-- 配置选择菜单 -->
    <el-dialog v-model="importDialogVisable" title="配置菜单" width="800">
      <div class="theme-x" v-for="theme in theme_list" :key="theme">
        <div class="name-x">
          <span>{{ theme }}</span>
          <div class="btns">
            <!-- <el-button>预览</el-button> -->
            <el-button
              @click="currentTheme.name = theme; currentTheme.options = themes[theme]; importDialogVisable = false;"
              :type="currentTheme.name === theme ? 'success' : 'primary'" :disabled="currentTheme.name === theme">{{
                currentTheme.name === theme ? '当前' : '' }}选择</el-button>
            <el-button type="danger" @click="deleteTheme(theme)">删除</el-button>
          </div>
        </div>
        <!-- <div class="theme">
          {{ themes[theme] }}
        </div> -->
      </div>
    </el-dialog>
  </main>
</template>

<style lang="scss" scoped>
$font-family: 'songti';

// 主题对话框
:deep(.theme-x) {
  margin: 10px 0px;
  border-radius: 5px;
  border: 1px solid #dedede;

  .name-x {
    display: flex;
    align-items: center;
    height: 40px;
    justify-content: space-between;
    padding: 0 30px;

    span {
      font-size: 16px;
    }
  }
}

main {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  font-family: $font-family, '宋体';

  .bg {
    position: fixed;
    z-index: -1;
    width: 100vw;

    img {
      width: 100%;
      height: 100%;
      opacity: .03;
    }
  }


  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  *::-webkit-scrollbar-track {
    background: rgb(239, 239, 239);
    border-radius: 2px;
  }

  *::-webkit-scrollbar-thumb {
    background: #bfbfbf;
    border-radius: 10px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: #333;
  }

  *::-webkit-scrollbar-corner {
    background: #179a16;
  }

  .left {
    display: flex;
    flex-direction: column;
    width: 40%;
    flex-shrink: 0;
    overflow: hidden;

    textarea {
      width: 100%;
      height: 100%;
      resize: none;
      padding: 8px;
      border: none !important;
      outline: none !important;
      background-color: transparent;
    }

    .opts {
      height: 50px;
      display: flex;
      justify-content: end;
      gap: 10px;
      align-items: center;
      padding: 0px 10px;

      button {
        cursor: pointer;
        min-width: 80px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background-color: rgb(37, 35, 118);
        color: aliceblue;
        font-size: 14px;
        transition: all .1s;

        &.primary {
          background-color: rgb(37, 35, 118);
        }

        &.danger {
          background-color: rgb(118, 35, 35);
        }

        &:disabled {
          cursor: not-allowed;
          background-color: #2F7623;

          &:hover {
            filter: brightness(1);
          }
        }

        &:hover {
          filter: brightness(1.3);
        }

        &:active {
          filter: brightness(1.15);
        }
      }
    }
  }

  .right {
    width: 100%;
    background-color: rgba(255, 255, 255, 0.141);
    padding: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .title {
      height: 50px;
      line-height: 50px;
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      position: relative;
      color: #3770FF;

      &::after {
        content: "";
        position: absolute;
        bottom: 8px;
        left: 0;
        width: 100%;
        border-bottom: 1px solid rgba(0, 0, 0, 0.2);
      }

      .turn {
        position: absolute;
        top: 5px;
        right: 20px;
        opacity: .8;
        user-select: none;

        &:hover {
          opacity: 1;
        }

        svg {
          user-select: none;
          cursor: pointer;
          transform: rotate(90deg);
        }
      }

      .number {
        position: absolute;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        color: #000000;
        font-size: 10px;
        font-weight: 300;

        &::before {
          content: "月访问量:";
        }
      }
    }

    .html {
      width: 100%;
      height: calc(100% - 50px);
      overflow-y: auto;
    }

    .table-x {
      width: 100%;
      height: calc(100% - 50px);
      overflow: auto;
      flex-shrink: 0;

      .table {
        display: flex;
        flex-direction: column;
        margin: 30px 0px;
        flex-shrink: 0;

        .tr {
          display: flex;
          flex-shrink: 0;

          .td {
            display: flex;
            width: 20%;
            flex-direction: column;
            word-break: break-all;
            line-height: 20px;
            border-bottom: 1px solid #000000;
            flex-shrink: 0;
            overflow: hidden;

            &.column-border {
              border-right: 1px solid #000000;
            }

            &:last-child {
              border-right: none;
            }

            &:has(.td-vertical-x) {
              padding: 0px !important;
            }

            .td-vertical-x {
              display: flex;
              flex-direction: column;
              height: 100%;

              .td {
                flex: 1;
                height: auto;
                width: 100%;
                display: flex;
                justify-content: center;
              }

              .td:last-child {
                border: none;
              }
            }
          }

          &:last-child {
            .td {
              border-bottom: none;
            }
          }

        }
      }


    }

    .empty {
      width: 100%;
    }
  }

  .set-pannel {
    position: fixed;
    top: 0;
    left: 0;
    min-width: 300px;
    width: 40%;
    height: 100vh;
    transition: left .2s;
    background-color: #ffffff;
    box-shadow: 1px 1px 2px 1px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;

    .close {
      height: 40px;
      padding: 5px 10px;
      display: flex;
      align-items: center;

      h2 {
        width: 100%;
        font-weight: bold;
        color: rgb(55, 112, 255);
        text-align: center;
        text-wrap: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      span {
        cursor: pointer;
        width: 20px;
        height: 20px;
        user-select: none;
        float: right;
        fill: #494949;

        &:hover {
          fill: #000000;
        }

        &:active {
          transform: scale(.8);
        }
      }

    }

    .content {
      height: 100%;
      padding: 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;

      .item-x {
        width: 100%;
        min-height: 80px;
        border-radius: 6px;
        border: 1px solid #00000018;
        position: relative;
        flex-shrink: 0;

        .name {
          font-weight: bold;
          display: block;
          position: absolute;
          width: 80px;
          text-align: center;
          top: -8px;
          left: 10px;
          background-color: #fff;
          color: rgb(0, 0, 0);
          font-size: 16px;
        }

        .opt {
          padding: 10px;

          .item {
            min-height: 40px;
            display: flex;
            align-items: center;
            color: rgba(0, 0, 0, 0.8);
            font-size: 14px;
            display: flex;

            .n {
              flex-shrink: 0;

              &::after {
                content: "：";
              }
            }

            .b {
              width: 100%;
              display: flex;
              gap: 8px;
            }
          }
        }
      }
    }

    .opts {
      height: 50px;
      display: flex;
      justify-content: end;
      gap: 10px;
      align-items: center;
      padding: 0px 10px;

      button {
        cursor: pointer;
        min-width: 80px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background-color: rgb(35, 118, 74);
        color: aliceblue;
        font-size: 14px;
        transition: all .1s;

        &:hover {
          filter: brightness(1.3);
        }

        &:active {
          filter: brightness(1.15);
        }
      }
    }
  }

  .show-left {
    position: fixed;
    width: 20px;
    height: 100vh;

    &:hover {
      .btn {
        opacity: 1;
      }
    }

    .btn {
      cursor: pointer;
      opacity: 0;
      user-select: none;
      position: absolute;
      background-color: rgb(231, 231, 231);
      width: 80px;
      height: 40px;
      left: -50px;
      top: 50%;
      transform: translateY(-50%);
      border-bottom-right-radius: 20px;
      border-top-right-radius: 20px;
      display: flex;
      justify-content: end;
      align-items: center;
      padding: 0px 10px;
      transition: all .2s;

      &:hover {
        left: -15px;

        * {
          opacity: 1;
        }
      }

      * {
        opacity: .7;
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

  }
}

@media screen and (max-width: 768px) {
  main {
    display: block;
    overflow-y: auto;

    .left {
      width: 100% !important;
      height: 70vh;

      .opts {
        justify-content: center;
      }
    }
  }

  .no-mobile {
    display: none;
  }
}
</style>

<style lang="scss">
/* 引导样式 */
.customTooltip {
  .introjs-tooltip-title {
    color: #82a6ff;
  }

  .introjs-skipbutton {
    font-size: 16px;

    &:hover {
      color: rgba(240, 248, 255, 0.829);
    }
  }
}
</style>