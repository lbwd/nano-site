document
  .getElementsByClassName('top-cover')[0]
  .addEventListener('click', animation);
document
  .getElementsByClassName('cover-image')[0]
  .addEventListener('click', animation);

function animation(event) {
  document.getElementsByClassName('top-cover')[0].classList.add('animation');
}
