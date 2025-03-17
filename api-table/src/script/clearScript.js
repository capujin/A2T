import setlog from "./setlog";
export default function clearScript(htmlText) {
    try {
        setlog("去脚本", '开始', 'clearScript:4')
        const scriptRegex = /<script[^>]*>(.*?)<\/script>/gi;
        // 替换函数，将 <script> 标签替换为 <div style="display: none;">内容</div>
        const replacedHtml = htmlText.replace(scriptRegex, (match, p1) => {
            return `<div style="display: none;">${p1}</div>`;
        });
        setlog("去脚本", '完成', 'clearScript:10')
        return replacedHtml;
    } catch (error) {
        setlog("去脚本", '异常', 'clearScript:13')
        return htmlText;
    }
}