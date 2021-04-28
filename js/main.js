let observer;

class Carousel extends HTMLElement {

  constructor() {
    super();
    this.scrollBehavior = "smooth";
  }

  static get observedAttributes() {
    return ["index"];
  }

  get index() {
    const total = this.children.length - 1;
    const slides = this.children;

    for (let index = 0; index < total; index++) {
      const slide = slides[index];
      const scroll = Math.round(slide.offsetLeft - this.clientWidth / 2);

      if (
        this.scrollLeft >= scroll &&
        this.scrollLeft <= scroll + slide.clientWidth
      ) {
        return index;
      }
    }

    return total;
  }

  set index(index) {
    if (typeof index !== "number" || Math.round(index) !== index) {
      throw new Error("Invalid index value. It must be an integer");
    }

    const slides = this.children;
    index = Math.min(Math.max(index, 0), slides.length - 1);
    this.target = slides[index];
  }

  get target() {
    return this.children[this.index];
  }

  set target(target) {
    if (target.parentElement !== this) {
      throw new Error("The target must be a direct child of this element");
    }

    const scroll = Math.round(
      target.offsetLeft - this.clientWidth / 2 + target.clientWidth / 2,
    );
    this.scrollFromLeft = Math.max(0, scroll);
    this.lastTarget = target;
  }

  get scrollFromLeft() {
    return this.scrollLeft;
  }

  set scrollFromLeft(scroll) {
    try {
      this.scroll({
        left: scroll,
        behavior: this.scrollBehavior,
      });
    } catch (err) {
      this.scrollLeft = scroll;
    }
  }

  get scrollFromRight() {
    return this.scrollWidth - this.clientWidth - this.scrollLeft;
  }

  set scrollFromRight(scroll) {
    this.scrollFromLeft = this.scrollWidth - this.clientWidth - scroll;
  }

  connectedCallback() {
    //To calculate the offset of slides relative to the document
    if (getStyleValue(this, "position") === "static") {
      this.style.position = "relative";
    }

    this.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case 37: //left
          this.index -= 1;
          e.preventDefault();
          break;

        case 39: //right
          this.index += 1;
          e.preventDefault();
          break;
      }
    });


    //Handle navigation if children have ids
    if (this.querySelector(":scope > [id]")) {
      window.addEventListener(
        "popstate",
        (event) => handleTarget(this, document.location.hash),
      );

      if (document.location.hash) {
        handleTarget(this, document.location.hash);
      }
      let scrolling;

      function handleScroll() {
        clearTimeout(scrolling);
        scrolling = setTimeout(() => {
          const target = this.target;
          this.lastTarget = target;
        }, 50);
      }

      this.addEventListener("scroll", handleScroll, false);

    }


    //Resize observer
    if (window.ResizeObserver) {
      if (!observer) {
        observer = new ResizeObserver(entries => {
          for (let entry of entries) {
            const element = entry.target;

            if (element.lastTarget) {
              const restored = element.scrollBehavior;
              element.scrollBehavior = "auto";
              element.target = element.lastTarget;
              element.scrollBehavior = restored;
            }
          }
        });
      }

      observer.observe(this);
    }
  }

  disconnectedCallback() {
    if (observer) {
      observer.unobserver(this);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "index") {
      this.index = parseInt(newValue);

    }
  }
}

function handleTarget(el, hash) {
  if (!hash) {
    return;
  }

  const target = el.querySelector(`:scope > ${hash}`);

  if (target) {
    el.target = target;
  }
}


function getStyleValue(el, name) {
  const value = getComputedStyle(el)[name];

  if (value && value.replace(/none/g, "").trim()) {
    return value;
  }
}


class CarouselInitializer {

  container

  title

  subtitle

  cards = {}

  cardPlaceholder = "<div>\n" +
    "      <img src=\"https://via.placeholder.com/350x150\">\n" +
    "      <h4>Loading</h4>\n" +
    "      <p>Loading</p>\n" +
    "    </div>"


  constructor({container, title, subtitle, fetchCards}) {
    this.container = document.getElementById(container)
    this.title = title
    this.subtitle = subtitle
    this.fetchCards = fetchCards
    this.render()
  }

  getCardCollection(promises, chunkSize) {

    for (let i = 0; i < promises.length; i++) {
      for (let n = 0; n < chunkSize; n++) {
        this.cards[("" + (i + 1) + n)] = '<div class="slide loading" id="slide-' + ("" + (i + 1) + n) + '">' + this.cardPlaceholder + '</div>';
      }
    }
    return Object.keys(this.cards).map((key) => [this.cards[key]]);
  }

  dateForHumans ( seconds ) {
    const levels = [
      [Math.floor(seconds / 31536000), 'y'],
      [Math.floor((seconds % 31536000) / 86400), 'd'],
      [Math.floor(((seconds % 31536000) % 86400) / 3600), 'h'],
      [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), 'm'],
      [(((seconds % 31536000) % 86400) % 3600) % 60, 's'],
    ];
    let returntext = '';

    for (let i = 0, max = levels.length; i < max; i++) {
      if ( levels[i][0] === 0 ) continue;
      returntext += ' ' + levels[i][0] + (levels[i][0] === 1 ? levels[i][1]: levels[i][1]);
    };
    return returntext.trim();
  }

  render() {
    const chunkSize = 3;
    const promises = this.fetchCards(chunkSize)
    const cards = this.getCardCollection(promises, chunkSize)

    this.container.innerHTML = this.container.innerHTML +
      "<div>" +
      "<h1>" + this.title + "</h1>" +
      "<carousel-component role=\"region\" aria-label=\"Gallery\" tabindex=\"0\">" +
        cards.join(" ") +
      "</carousel-component>" +
      "</div>"

    this.container.innerHTML = this.container.innerHTML + '<p>\n' +
      '  <button class="carousel-prev">&larr;</button>\n' +
      '  <button class="carousel-next">&rarr;</button>\n' +
      '</p>';


    for (let i = 0; i < promises.length; i++) {

      promises[i].then(rs => {
        for (let n = 0; n < chunkSize; n++) {
          let h = '<figure>' +
            "      <img src='" + rs[n].image + "'>" +
            "<figcaption>"+rs[n].type+" - "+this.dateForHumans(rs[n].duration)+"</figcaption>"+
              "</figure>" +
            "      <h4>" + rs[n].title + "</h4>\n" +
            "    ";

          document.getElementById("slide-" + (i + 1) + n).classList.remove("loading")
          document.getElementById("slide-" + (i + 1) + n).innerHTML = h
        }
      })
    }

    const nextButton = this.container.querySelector(".carousel-next"),
      prevButton = this.container.querySelector(".carousel-prev")


    customElements.define("carousel-component", Carousel);
    const carousel = document.querySelector("carousel-component");

    const checkButtonAvailability = () => {

      if (carousel.index == 1) {
        prevButton.setAttribute('disabled', true);
      } else {
        if (prevButton.hasAttribute('disabled')) prevButton.removeAttribute('disabled');
      }
      if (carousel.index == cards.length - 1) {
        nextButton.setAttribute('disabled', true);
      } else {
        if (nextButton.hasAttribute('disabled')) nextButton.removeAttribute('disabled');
      }
    }

    checkButtonAvailability()

    nextButton.addEventListener(
      "click",
      () => {
        console.log(carousel.index)
        carousel.index += 1
        checkButtonAvailability()
      },
    );

    prevButton.addEventListener(
      "click",
      () => {
        carousel.index -= 1
        checkButtonAvailability()
      },
    );

  }

}
