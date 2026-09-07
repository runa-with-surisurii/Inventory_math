const seedHistory={
  'Rice Bag 25kg':[16,18,17,20,19,18,21,17],
  'Cooking Oil 5L':[10,12,11,13,12,14,11,12],
  'Chicken Breast':[42,45,44,48,46,43,49,47],
  'Mozzarella 1kg':[9,10,8,11,12,9,10,11],
  'Tomato Crate':[25,28,27,30,29,26,31,28],
  'Burger Buns':[56,60,58,63,61,59,65,62]
};
try{
  const existing=JSON.parse(localStorage.getItem('kitcheniq-history')||'null');
  if(!existing||typeof existing!=='object'||!Object.keys(existing).length){
    localStorage.setItem('kitcheniq-history',JSON.stringify(seedHistory));
  }
}catch{localStorage.setItem('kitcheniq-history',JSON.stringify(seedHistory));}
if(!document.getElementById('discountCards')){
  const holder=document.createElement('div');
  holder.id='discountCards';
  holder.hidden=true;
  document.body.appendChild(holder);
}