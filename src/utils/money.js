export function fmtMoney(n) {
  return '¥' + Number(n || 0).toFixed(2);
}

export const expCats = ['餐饮', '交通', '购物', '书籍', '设备', '会议', '住宿', '日用', '其他'];
export const incCats = ['工资', '奖学金', '助研', '稿费', '兼职', '其他'];
export const reimCats = ['差旅报销', '设备报销', '会议报销', '材料报销', '其他'];
