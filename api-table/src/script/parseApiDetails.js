import setlog from "./setlog";
import clearScript from "./clearScript";
export default function parseApiDetails(htmlText) {
    const html_text = clearScript(htmlText)
    const parser = new DOMParser();
    if (!parser) {
        setlog("parseFromString转换", '异常，浏览器不支持DOMParser API，请切换浏览器重试', 'parseApiDetails:7')
        return []
    }
    const doc = parser.parseFromString(html_text, 'text/html');
    if (!doc) {
        setlog("parseFromString转换", '异常', 'parseApiDetails:15')
        return []
    }
    const apiDetails = [];

    // 选择所有的操作块
    const opblocks = doc.querySelectorAll('.opblock');
    if (opblocks.length === 0) {
        setlog("操作块", `异常，未提取到操作块，请检查数据源是否包含，检测是否数据源问题：打开Swagger网页的控制台然后运行以下代码【document.querySelectorAll('.opblock');】检查是否有元素数组，若没有，则是后端接口文档问题。`, 'parseApiDetails:23')
        return []
    }
    const opblocks_isopen = []
    opblocks.forEach(open => {
        if (open.className.match('is-open')) {
            opblocks_isopen.push(open)
        }
    })

    if (opblocks_isopen.length === 0) {
        setlog("操作块-展开态", `异常，未检测到有展开的操作块，请确保源数据为操作块展开后的代码。`, 'parseApiDetails:34')
        return []
    }
    opblocks_isopen.forEach(opblock => {
        setlog("操作块-展开态-提取", `开始`, 'parseApiDetails:38')
        const apiName = opblock.querySelector('.opblock-summary-description').textContent.trim();
        if (!apiName) {
            setlog("操作块-展开态-提取API名字", `异常，未检测到Api名称，请检查数据源是否包含，检测是否数据源问题：打开Swagger网页的控制台然后运行以下代码【document.querySelector('.opblock-summary-description');】检查是否有元素数组，若没有，则是后端接口文档问题。`, 'parseApiDetails:41')
        } else {
            setlog("操作块-展开态-提取API名字", `完成，Api名称为${apiName}`, 'parseApiDetails:43')
        }
        const method = opblock.querySelector('.opblock-summary-method').textContent.trim();
        if (!method) {
            setlog("操作块-展开态-提取请求方式", `异常，未检测到请求方式，请检查数据源是否包含，检测是否数据源问题：打开Swagger网页的控制台然后运行以下代码【document.querySelector('.opblock-summary-method');】检查是否有元素数组，若没有，则是后端接口文档问题。`, 'parseApiDetails:47')
        } else {
            setlog("操作块-展开态-提取请求方式", `完成，请求方式为${method}`, 'parseApiDetails:49')
        }
        const path = opblock.querySelector('.opblock-summary-path a span').textContent.trim();
        if (!path) {
            setlog("操作块-展开态-提取请求路径", `异常，未检测到请求路径，请检查数据源是否包含，检测是否数据源问题：打开Swagger网页的控制台然后运行以下代码【document.querySelector('.opblock-summary-path');】检查是否有元素数组，若没有，则是后端接口文档问题。`, 'parseApiDetails:34')
        } else {
            setlog("操作块-展开态-提取请求路径", `完成，请求路径为${path}`, 'parseApiDetails:43')
        }
        // 提取请求参数
        const params = [];
        const paramRows = opblock.querySelectorAll('.parameters tbody tr');
        if (paramRows.length === 0) {
            setlog("操作块-展开态-提取请求参数", `异常，未检测到请求参数，请检查数据源是否包含，检测是否数据源问题：打开Swagger网页的控制台然后运行以下代码【document.querySelector('.parameters tbody tr');】检查是否有元素数组，若没有，则是后端接口文档问题。`, 'parseApiDetails:61')
        } else {
            paramRows.forEach(row => {
                const paramName = row.querySelector('.parameter__name').textContent.trim();
                const paramType = row.querySelector('.parameter__type').textContent.trim();

                // 提取示例值中的具体字段
                const exampleValue = row.querySelector('.body-param__example.microlight')?.textContent.trim();
                let paramDetails = `${paramName}: ${paramType}`;
                if (exampleValue) {
                    paramDetails += ` (示例值: ${exampleValue})`;
                }
                params.push(paramDetails);
            });
            setlog("操作块-展开态-提取请求参数", `完成，请求参数为${params}`, 'parseApiDetails:43')
        }

        // 提取返回结果
        const response = opblock.querySelector('.responses-table .response .highlight-code')?.textContent.trim() || 'Result';
        const response_key = JSON.parse(response) && Object.keys(JSON.parse(response))
        console.log('请求参数', params);
        apiDetails.push({
            '接口名称': apiName,
            '请求方法': method,
            '请求地址': path,
            '请求参数': formartParams(params).join(","),
            '返回结果': response_key.length && response_key.join("、")
        });
        setlog("操作块-展开态-提取", `完成`, 'parseApiDetails:75')
    });

    return apiDetails;
}

function formartParams(arr){
    const res = arr.map((str) => {
        const _str = str.replaceAll(" ", "").replaceAll("*", "");
        return _str.split(":")[0].trim();
    })
    return res
}