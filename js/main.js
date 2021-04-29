let observer;

/**
 * Create Custom HTML Element
 */
class Carousel extends HTMLElement {

  constructor() {
    super();
    this.scrollBehavior = "smooth";
  }

  /**
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ["index"];
  }

  /**
   * Getter index -> observed
   * @returns {number}
   */
  get index() {
    const total = this.children.length - 1;
    const slides = this.children;

    /**
     * Loop slides and calc offset
     */
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

  /**
   * Index setter
   * @param index
   */
  set index(index) {
    if (typeof index !== "number" || Math.round(index) !== index) {
      throw new Error("Invalid index value. It must be an integer");
    }

    const slides = this.children;
    index = Math.min(Math.max(index, 0), slides.length - 1);
    this.target = slides[index];
  }

  /**
   * Get Target Slide
   * @returns {Element}
   */
  get target() {
    return this.children[this.index];
  }

  /**
   * Set Target Slide
   * @param target
   */
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

  /**
   * Get distance scroll from left
   * @returns {number}
   */
  get scrollFromLeft() {
    return this.scrollLeft;
  }


  /**
   * Set distance scroll from left
   */
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

  /**
   * Get distance scroll from right
   * @returns {number}
   */
  get scrollFromRight() {
    return this.scrollWidth - this.clientWidth - this.scrollLeft;
  }

  /**
   * Set distance scroll from right
   * @param scroll
   */
  set scrollFromRight(scroll) {
    this.scrollFromLeft = this.scrollWidth - this.clientWidth - scroll;
  }

  /**
   * Native Html callback
   */
  connectedCallback() {
    //To calculate the offset of slides relative to the document
    if (getStyleValue(this, "position") === "static") {
      this.style.position = "relative";
    }

    // Bind Keyboard Events
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

      /* Scroll via mousewheel */
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

  /**
   * Native Html Callback
   */



  /**
   * Native Html Callback
   * Reset Index
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "index") {
      this.index = parseInt(newValue);
    }
  }
}

/**
 * Usefull if container is anchored
 * @param el
 * @param hash
 */
function handleTarget(el, hash) {
  if (!hash) {
    return;
  }

  const target = el.querySelector(`:scope > ${hash}`);

  if (target) {
    el.target = target;
  }
}

/**
 * Return value by style property for passed element
 * @param el
 * @param name
 * @returns {*}
 */
function getStyleValue(el, name) {
  const value = getComputedStyle(el)[name];

  if (value && value.replace(/none/g, "").trim()) {
    return value;
  }
}

/**
 * Initializer class
 */
class CarouselInitializer {
  container

  cardPlaceholder = "<div>\n" +
    "      <div class='skeleton skeleton-image'></div>\n" +
    "      <div class='skeleton skeleton-text'></div>\n" +
    "    </div>"

  cards = []

  /**
   * Initialize class global params
   * @param container
   * @param title
   * @param subtitle
   * @param icon
   * @param fetchCards
   */
  constructor({container, title, subtitle, icon, fetchCards}) {
    this.container = document.getElementById(container)
    this.title = title
    this.icon = icon
    this.subtitle = subtitle
    this.fetchCards = fetchCards
    this.render()
  }

  /**
   * Return object of cards ordered by key
   * @param promises
   * @param chunkSize
   * @returns {[*][]}
   */
  getCardCollection(promises, chunkSize) {

    for (let i = 0; i < promises.length; i++) {
      for (let n = 0; n < chunkSize; n++) {
        this.cards[("" + (i + 1) + n)] = '<div class="slide loading" id="slide-' + ("" + (i + 1) + n) + '">' + this.cardPlaceholder + '</div>';
      }
    }
    return Object.keys(this.cards).map((key) => [this.cards[key]]);
  }

  /**
   * Utility to generate human friendly date
   * @param seconds
   * @returns {string}
   */
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

  /**
   * Create dom elements and handles changes
   */
  render() {
    const chunkSize = 3;
    const promises = this.fetchCards(chunkSize)
    const cards = this.getCardCollection(promises, chunkSize)
    console.log(cards);
    this.container.innerHTML = this.container.innerHTML +
      "<div>" +
      "<div class='intro-container'>" +
        "<div class='icon'>" +
          "<span class=\"material-icons\">"+this.icon+"</span>" +
        "</div>" +
        "<div class='title'>" +
          "<h1>" + this.title + "</h1>" +
          "<p>"+this.subtitle+"</p>" +
        "</div>" +
      "</div>" +
      "<carousel-component role=\"region\" aria-label=\"Gallery\" tabindex=\"0\">" +
        cards.join(" ") +
      "</carousel-component>" +
      "</div>"

    this.container.innerHTML = this.container.innerHTML + '<div class="nav">' +
      '  <button class="carousel-prev"><span class="material-icons">chevron_left</span></button>' +
      '  <button class="carousel-next"><span class="material-icons">chevron_right</span></button>\n' +
      '</div>';


    for (let i = 0; i < promises.length; i++) {

      promises[i].then(rs => {
        console.log()
        for (let n = 0; n < chunkSize; n++) {
          const slide = this.container.querySelector("#slide-" + (i + 1) + n);
          const h = '<figure>' +
            "      <img src='" + rs[n].image + "'>" +
            "<figcaption>"+rs[n].type+" - "+this.dateForHumans(rs[n].duration)+"</figcaption>"+
              "</figure>" +
            "      <h4>" + rs[n].title + "</h4>\n" +
            "    ";

          slide.classList.remove("loading")
          slide.classList.add(rs[n].cardinality)
          slide.innerHTML = h
        }
      })
    }

    /**
     * Instantiate HTML Custom Object
     */
    (function(){
      if(!customElements.get("carousel-component")){
        customElements.define("carousel-component", Carousel);
      }
    })(this.container.id);

    const carousel = this.container.querySelector("carousel-component");

    /**
     * Nav Buttons
     * @type {Element}
     */
    const nextButton = this.container.querySelector(".carousel-next"),
      prevButton = this.container.querySelector(".carousel-prev")
    let cIndex = carousel.index;

    //Nav Button status
    const checkButtonAvailability = () => {

      if (cIndex == 1) {
        prevButton.setAttribute('disabled', true);
      } else {
        if (prevButton.hasAttribute('disabled')) prevButton.removeAttribute('disabled');
      }
      if (cIndex == cards.length - 1) {
        nextButton.setAttribute('disabled', true);
      } else {
        if (nextButton.hasAttribute('disabled')) nextButton.removeAttribute('disabled');
      }
    }

    checkButtonAvailability()

    nextButton.addEventListener(
      "click",
      () => {
        carousel.index += 1
        cIndex += 1
        checkButtonAvailability()
      },
    );

    prevButton.addEventListener(
      "click",
      () => {
        carousel.index -= 1
        cIndex -= 1
        checkButtonAvailability()
      },
    );

  }

}
