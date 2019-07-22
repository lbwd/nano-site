document.getElementsByClassName('top-cover')[0].addEventListener('click', clickTransistion);
document.getElementsByClassName('cover-image')[0].addEventListener('click', clickTransistion);

function clickTransistion(event) {
  let elem = document.getElementsByClassName('top-cover')[0];
  let first = elem.getBoundingClientRect();

  elem.classList.add('moving');
  elem.classList.add('moved-top');
  let last = elem.getBoundingClientRect();

  let changeTop = first.top - last.top;
  elem.style.transform = 'translateY(' + changeTop + 'px)';

  requestAnimationFrame(function() {
    elem.classList.add('transition');
    elem.style.transform = '';
    elem.addEventListener('transitionend', function handler(event) {
      elem.classList.remove('transition');
      elem.classList.remove('moving');

      elem.removeEventListener('transitionend', handler);
    });
  });
}
