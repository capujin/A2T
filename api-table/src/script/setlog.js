export default function setlog(title, status, row_num) {
    const logEl = document.getElementById("log");
    const da = new Date()
    logEl.innerHTML += `<p ${status.startsWith('异常') ? `style="color:red"` : ''}> ${da.getHours() + ":" + da.getMinutes() + ":" + da.getSeconds() + ":" + da.getMilliseconds()}<strong> ${title}：</strong>${status} <a href="javascript:;">#行${row_num}</a></p>`
}