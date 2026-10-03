(function () {
  const el = document.getElementById('x');
  el.innerHTML = '<b>' + window.location.hash + '</b>';
  eval('1+1');
  new Function('return 1');
})();
