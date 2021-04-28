let observer;

export default class Carousel extends HTMLElement {
  static get observedAttributes() {
    return ["index"];
  }

  constructor() {
    super();
    this.scrollBehavior = "smooth";
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
      return;
    }
  }

  next(amount = 1) {
    this.scrollFromLeft += this.clientWidth * amount;
  }

  prev(amount = 1) {
    this.scrollFromLeft -= this.clientWidth * amount;
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
