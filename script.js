// © 2024 Data Culture
// Released under the ISC license.
// https://studio.datacult.com/

import { h, render } from "https://esm.sh/preact";
import { useState, useEffect, useRef } from "https://esm.sh/preact/hooks";
import htm from "https://esm.sh/htm";

// set asset path based on environment
const ENV = "production"; // development or production
let ASSET_PATH = "";
if (ENV === "development") {
  console.log("Solutions Viz - Development mode");
  ASSET_PATH = "./assets";
} else {
  console.log("Solutions Viz - Production mode");
  ASSET_PATH =
    "https://datacult.github.io/caseforchildcare-y2-solutions-viz/assets";
}

const html = htm.bind(h);

function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

// create arc for textPath (no return line)
// source: https://www.visualcinnamon.com/2015/09/placing-text-on-arcs/
function getArcForTextPlacement(angle, arcDefault, arcReversed) {
  let arc = arcDefault;
  if (radiansToDegrees(angle) > 90 && radiansToDegrees(angle) < 270) {
    arc = arcReversed;
  }

  var firstArcSection = /(^.+?)L/;
  // The [1] gives back the expression between the () (thus not the L as well) which is exactly the arc statement
  var newArc = firstArcSection.exec(arc)[1];
  // Replace all the comma's so that IE can handle it -_-
  // The g after the / is a modifier that "find all matches rather than stopping after the first match"
  newArc.replace(/,/g, " ");
  return newArc;
}

const categoryColorsWithNames = {
  "direct care solutions": "coral",
  "employee engagement & culture": "green",
  "financial support & benefits": "plum",
  "flexible work & leave policies": "violet",
  "learning & assessment": "tangerine",
  "policy, advocacy, & systemic change": "teal",
};

const categoryColors = {
  violet: "#d6b9ff",
  violetdeep: "#6a3daa",
  violettransparent: "rgba(214, 185, 255, 0.25)",
  violettext: "#202124",

  coral: "#e0594f",
  coraldeep: "#b63b32",
  coraltransparent: "rgba(224, 89, 79, 0.18)",
  coraltext: "#fff",

  plum: "#733250",
  plumdeep: "#5d1e3b",
  plumtransparent: "rgba(115, 50, 80, 0.14)",
  plumtext: "#fff",

  green: "#99d68f",
  greendeep: "#3d6537",
  greentransparent: "rgba(153, 214, 143, 0.2)",
  greentext: "#202124",

  tangerine: "#ff8a53",
  tangerinedeep: "#bc592a",
  tangerinetransparent: "rgba(255, 138, 83, 0.2)",
  tangerinetext: "#202124",

  teal: "#2b91ad",
  tealdeep: "#0b5d73",
  tealtransparent: "rgba(43, 145, 173, 0.16)",
  tealtext: "#fff",
};

function Viz() {
  // state
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isInView, setIsInView] = useState(false);
  const vizRef = useRef(null);

  // square size
  const squareSize = 1300;
  const margin = 20;

  const widthCategoryArc = 27;
  const distanceCategoryArcPetals = 32;
  const lengthPetals = 290;

  const outerRadiusCategories = squareSize / 2 - margin;
  const innerRadiusCategories = outerRadiusCategories - widthCategoryArc; // 27 is the width of the category arc
  const outerRadiusPetals = innerRadiusCategories - distanceCategoryArcPetals; // 32 is the distance between the category arc and petals
  const innerRadius = outerRadiusPetals - lengthPetals; // 290 is the width of a petal arc

  const circlePadding = 0.01;
  const spaceBetweenGroups = 0.035;
  const spaceBetweenPetalsWithinGroup = 0.01;
  const cornerRadiusPetals = 15; // before 18

  // load data
  useEffect(() => {
    d3.csv(`${ASSET_PATH}/data/solutions-data.csv`).then((loadedData) => {
      // sort data by category
      loadedData.sort((a, b) => {
        if (a["Category"] < b["Category"]) {
          return -1;
        }
        if (a["Category"] > b["Category"]) {
          return 1;
        }
        return 0;
      });

      setData(loadedData);

      // get unique categories
      const uniqueCategories = Array.from(
        new Set(loadedData.map((d) => d["Category"]))
      );
      setCategories(uniqueCategories);

      fixDetailViewNavItems(loadedData);
    });
  }, []);

  // Intersection Observer to check if Viz is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );

    if (vizRef.current) {
      observer.observe(vizRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // scale to position petals in a circle
  const circleScale = d3
    .scaleBand()
    .domain(data.map((_, index) => index))
    .range([0, 2 * Math.PI])
    .padding(circlePadding);

  /***
   * DETAIL VIEW (partly handled within Webflow itself)
   */

  // in detail view, show correct solution details
  function showSolutionDetailGroup(solutionId) {
    const detailGroupItems = document.querySelectorAll(
      ".solution-details__group"
    );
    detailGroupItems.forEach((groupItem) => {
      groupItem.classList.remove("shown");
    });
    const selectedGroupItem = document.querySelector(
      `.solution-details__group[solution-id="${solutionId}"]`
    );
    if (selectedGroupItem) {
      selectedGroupItem.classList.add("shown");
    }
  }

  function showDetailResources(
    solutionId,
    categoryName = "direct care solutions"
  ) {
    d3.csv(`${ASSET_PATH}/data/resources-data.csv`).then((resourcesData) => {
      // find all resources for the solution, depending on the solution id
      const solutionResources = resourcesData.filter(
        (d) => d["Solution ID"] === solutionId
      );
      const colorName = categoryColorsWithNames[categoryName.toLowerCase()];
      const resourceContentHtml = solutionResources
        .map((resource) => {
          return `<a href="${resource["Resource link"]}" target="_blank" style="border-color:${categoryColors[colorName]}" class="solution-details__resources-item"><div class="solution-details__resources-item__title-row w-layout-hflex"><div class="h-s__medium">${resource["Resource title"]}</div><div class="solution-details__resources-caret w-embed"><svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 7L1 12.5" stroke="#202124" stroke-width="2"></path></svg></div></div><p>${resource["Resource description"]}</p></a>`;
        })
        .join("");
      const resourcesContainer = document.querySelector(
        `.solution-details__group[solution-id="${solutionId}"] .solution-details__resources-list`
      );
      resourcesContainer.innerHTML = resourceContentHtml;
    });
  }

  function showDetailQuotes(solutionId, categoryName) {
    d3.csv(`${ASSET_PATH}/data/quotes-data.csv`).then((quotesData) => {
      // find all quotes for the solution, depending on the solution id
      const solutionQuotes = quotesData.filter(
        (d) => d["Solution ID"] === solutionId
      );
      const colorName = categoryColorsWithNames[categoryName.toLowerCase()];
      const transparentColor = categoryColors[`${colorName}transparent`];
      const outerTextColor = categoryColors[`${colorName}deep`];

      const quoteContentHtml = solutionQuotes
        .map((quote) => {
          return `<div
              style="background-color:${transparentColor};color:${outerTextColor}"
              class="w-layout-vflex solution-details__quotes-item"
            >
              <p class="h-s__medium-long">
                ${quote["Quote"]}
              </p>
              <div class="w-layout-vflex solution-details__quotes-author">
                <div class="h-s__medium">${quote["Author name"]}</div>
                <p class="p-small">
                  ${quote["Author title"]}
                </p>
              </div>
            </div>`;
        })
        .join("");
      const quotesContainer = document.querySelector(
        `.solution-details__group[solution-id="${solutionId}"] .solution-details__quotes-list`
      );
      quotesContainer.innerHTML = quoteContentHtml;
    });
  }

  function showDetailCases(solutionId, categoryName) {
    d3.csv(`${ASSET_PATH}/data/casestudies-data.csv`).then((caseData) => {
      const solutionCases = caseData.filter(
        (d) => d["Solution ID"] === solutionId
      );
      const colorName = categoryColorsWithNames[categoryName.toLowerCase()];
      const transparentColor = categoryColors[`${colorName}transparent`];
      const backgroundColor = categoryColors[colorName];
      const textColor = categoryColors[`${colorName}text`];

      let casesContentHtml = solutionCases
        .map((caseStudy) => {
          return `<div
              style="border-color:${backgroundColor}"
              class="w-layout-vflex solution-details__cases-item"
            >
              <div
                style="background-color:${backgroundColor};color:${textColor}"
                class="w-layout-vflex solution-details__cases-header"
              >
                <h6>${caseStudy["Case study title"]}</h6>
              </div>
              <div class="w-layout-vflex solution-details__cases-content">
                <p>
                  ${caseStudy["Case study description"]}
                </p>
                <a
                  style="background-color:${transparentColor}"
                  href="${caseStudy["Case study link"]}"
                  target="_blank"
                  class="solution-details__cases-btn w-inline-block"
                  ><div class="p-small">Read more</div>
                  <div class="solution-details__resources-caret w-embed">
                    <svg
                      width="8"
                      height="12"
                      viewBox="0 0 8 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M1 1.5L6 7L1 12.5" stroke="#202124" stroke-width="2"></path>
                    </svg></div
                ></a>
              </div>
            </div>`;
        })
        .join("");

      // add headline for case studies
      if (solutionCases.length > 0) {
        casesContentHtml = `
          <h5 class="h-m__medium">Case studies</h5>
          <div class="w-layout-vflex solution-details__cases-list">
            ${casesContentHtml}
          </div>
        `;
      }
      const casesContainer = document.querySelector(
        `.solution-details__group[solution-id="${solutionId}"] .solution-details__cases-wrapper`
      );
      casesContainer.innerHTML = casesContentHtml;
    });
  }

  // interaction with detail view coded in Webflow
  function handlePetalClick(item) {
    console.log("handlePetalClick", item);

    // in detail view, show correct solution details (on click in the petal)
    showSolutionDetailGroup(item["Solution ID"]);

    // build up resource panel manually due to Webflow restrictions
    showDetailResources(item["Solution ID"], item["Category"]);

    // build up quote panel manually due to Webflow restrictions
    showDetailQuotes(item["Solution ID"], item["Category"]);

    // build up case study panel manually due to Webflow restrictions
    showDetailCases(item["Solution ID"], item["Category"]);

    // show the solution details modal
    const solutionsModal = document.getElementById("solution-details");
    solutionsModal.style.display = "flex";

    // in detail view, show correct nav item as selected (on click in the petal)
    const detailNavItems = document.querySelectorAll(
      ".solution-details__nav-item"
    );
    detailNavItems.forEach((navItem) => {
      navItem.classList.remove("selected");
    });
    const selectedNavItem = document.querySelector(
      `.solution-details__nav-item[solution-id="${item["Solution ID"]}"]`
    );
    if (selectedNavItem) {
      selectedNavItem.classList.add("selected");
    }
  }

  // avoid issue of Webflow nested CMS issue that limits nested collection list items to 5
  function fixDetailViewNavItems(loadedData) {
    console.log("fixDetailViewNavItems");
    const detailNavGroups = document.querySelectorAll(
      ".solution-details__nav-group"
    );
    detailNavGroups.forEach((navGroup) => {
      // remove everything from the nav group
      navGroup.innerHTML = "";
      // get the category name
      const categoryName = navGroup.getAttribute("category");
      // get the solutions in the category
      const categorySolutions = loadedData.filter(
        (d) => d["Category"].toLowerCase() === categoryName.toLowerCase()
      );
      // add the solutions to the nav group
      categorySolutions.forEach((solution) => {
        const colorName = categoryColorsWithNames[categoryName.toLowerCase()];
        const borderColor = categoryColors[colorName];
        const textColor = categoryColors[`${colorName}deep`];
        navGroup.innerHTML += `
          <div class="solution-details__nav-item w-dyn-item" role="listitem" solution-id="${solution["Solution ID"]}" solution-category="${solution["Category"]}" style="border-color:${borderColor}">
            <div class="p-small" style="color:${textColor}">${solution["Solution abbreviation"]}</div>
          </div>
        `;
      });
    });

    // in detail view, on click in the nav
    const detailNavItems = document.querySelectorAll(
      ".solution-details__nav-item"
    );
    detailNavItems.forEach((navItem) => {
      console.log("add onclick handlers to nav items", navItem);
      navItem.onclick = function () {
        console.log("nav item clicked", navItem);
        // have the correct nav item selected
        detailNavItems.forEach((navItem) => {
          navItem.classList.remove("selected");
        });
        navItem.classList.add("selected");

        // change the detail content to the correct group
        showSolutionDetailGroup(navItem.getAttribute("solution-id"));

        // show the resources for the solution
        showDetailResources(
          navItem.getAttribute("solution-id"),
          navItem.getAttribute("solution-category")
        );

        // show the quotes for the solution
        showDetailQuotes(
          navItem.getAttribute("solution-id"),
          navItem.getAttribute("solution-category")
        );

        // show the case studies for the solution
        showDetailCases(
          navItem.getAttribute("solution-id"),
          navItem.getAttribute("solution-category")
        );

        // on tablet and down, hide the nav and show the details
        if (window.innerWidth <= 991) {
          document.querySelector(".solution-details__nav").style.display =
            "none";
          document.querySelector(
            ".solution-details__group-wrapper"
          ).style.display = "block";
        }
      };
    });
  }
  /**
   * END DETAIL VIEW FUNCTIONS
   */

  // spaced petal groups
  const petalGroups = categories.map((category, index) => {
    const categoryData = data.filter((d) => d["Category"] === category);

    const groupStartAngle =
      circleScale(data.indexOf(categoryData[0])) + circlePadding;
    const groupEndAngle =
      circleScale(data.indexOf(categoryData[categoryData.length - 1])) +
      circleScale.bandwidth() -
      circlePadding;

    const groupScale = d3
      .scaleBand()
      .domain(categoryData.map((_, index) => index))
      .range([
        groupStartAngle + spaceBetweenGroups,
        groupEndAngle - spaceBetweenGroups,
      ])
      .padding(spaceBetweenPetalsWithinGroup);

    const petals = categoryData.map((item, petalGroupItemIndex) => {
      const petalArc = d3
        .arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadiusPetals)
        .startAngle(groupScale(petalGroupItemIndex))
        .endAngle(groupScale(petalGroupItemIndex) + groupScale.bandwidth())
        .padAngle(spaceBetweenPetalsWithinGroup)
        .cornerRadius(cornerRadiusPetals);

      // create arc for hover state (no padding), invisible
      const petalArcHover = d3
        .arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadiusPetals)
        .startAngle(groupScale(petalGroupItemIndex))
        .endAngle(groupScale(petalGroupItemIndex) + groupScale.bandwidth())
        .padAngle(0)
        .cornerRadius(cornerRadiusPetals);

      let petalTextAngle =
        radiansToDegrees(
          groupScale(petalGroupItemIndex) + groupScale.bandwidth() / 2
        ) - 90;
      let petalIconAngleBack =
        -1 *
          radiansToDegrees(
            groupScale(petalGroupItemIndex) + groupScale.bandwidth() / 2
          ) -
        90 +
        180;
      let petalTextTranslateX =
        innerRadius + (outerRadiusPetals - innerRadius) / 2;
      let petalButtonTranslateX = innerRadius + 20;

      // flip text if it's on the lower half of the circle
      if (radiansToDegrees(groupScale(petalGroupItemIndex)) > 180) {
        petalTextAngle += 180;
        petalTextTranslateX *= -1;
        petalButtonTranslateX *= -1;
        petalIconAngleBack += 180;
      }

      return html`
        <g
          class="petal ${hoveredItem
            ? hoveredItem === item
              ? ""
              : "petal__not_hovered"
            : ""}"
          data-category="${item["Category"]}"
          data-solution="${item["Solution abbreviation"]}"
          solution-id="${item["Solution ID"]}"
          onclick="${() => handlePetalClick(item)}"
          fill="grey"
        >
          <path d="${petalArc()}" stroke="none" />
          <path
            d="${petalArcHover()}"
            opacity="0"
            onmouseover="${() => setHoveredItem(item)}"
            onmouseout="${() => setHoveredItem(null)}"
            stroke="red"
          />
          <text
            text-anchor="middle"
            y="5"
            transform="rotate(${petalTextAngle}) translate(${petalTextTranslateX},0)"
            fill="black"
            class="petal-text"
          >
            ${item["Solution abbreviation"]}
          </text>
          <g
            class="detail-button-group ${hoveredItem
              ? hoveredItem === item
                ? "hovered"
                : ""
              : ""}"
            transform="rotate(${petalTextAngle}) translate(${petalButtonTranslateX},0) rotate(${petalIconAngleBack}) "
          >
            <image
              href="${ASSET_PATH}/illustrations/detail-button.svg"
              alt="Arrow right"
              height="30px"
              width="30px"
              transform="translate(-15,-15)"
            />
          </g>
        </g>
      `;
    });

    return {
      category: category,
      categoryStartAngle: groupStartAngle,
      categoryEndAngle: groupEndAngle,
      categoryData: categoryData,
      groupScale: groupScale,
      petals: petals,
    };
  });

  // category arcs
  const categoryGroups = petalGroups.map((petalGroup, index) => {
    const startAngle = petalGroup.categoryStartAngle + spaceBetweenGroups;
    const endAngle = petalGroup.categoryEndAngle - spaceBetweenGroups;

    const categoryArcShape = d3
      .arc()
      .innerRadius(innerRadiusCategories)
      .outerRadius(outerRadiusCategories)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(10);

    // make text arc slightly wider than category arc to avoid text clipping in case of only few petals per category,
    // exact value not relevant as category text is centered on path
    const categoryTextSideOverlap = 0.5;
    const categoryArcTextDefault = d3
      .arc()
      .innerRadius(innerRadiusCategories)
      .outerRadius(outerRadiusCategories)
      .startAngle(startAngle - categoryTextSideOverlap)
      .endAngle(endAngle + categoryTextSideOverlap)
      .cornerRadius(10);

    const categoryArcTextReversed = d3
      .arc()
      .innerRadius(innerRadiusCategories)
      .outerRadius(outerRadiusCategories)
      .startAngle(endAngle + categoryTextSideOverlap)
      .endAngle(startAngle - categoryTextSideOverlap)
      .cornerRadius(10);

    // create arc for textPath (no return line and using reversed arc on lower half of circle)
    const textArc = getArcForTextPlacement(
      startAngle,
      categoryArcTextDefault(),
      categoryArcTextReversed()
    );

    return html`
      <g
        class="category ${hoveredItem
          ? hoveredItem["Category"] === petalGroup.category
            ? ""
            : "category__not_hovered"
          : ""}"
        data-category="${petalGroup.category}"
      >
        <path d="${categoryArcShape()}" fill="grey" />

        <defs>
          <path d="${textArc}" id="category-path-${index}" fill="transparent" />
        </defs>
        <text
          class="cat-text"
          dominant-baseline="hanging"
          dy="${radiansToDegrees(startAngle) > 90 &&
          radiansToDegrees(startAngle) < 270
            ? -21
            : 6}"
        >
          <textPath
            href="#category-path-${index}"
            startOffset="50%"
            text-anchor="middle"
            >${petalGroup.category}</textPath
          >
        </text>
      </g>
    `;
  });

  const innerContentDefault = html`
    <div
      class="innerContent innerContent__default"
      xmlns="http://www.w3.org/1999/xhtml"
    >
      <p class="title">Childcare Solutions</p>
      <p class="subtitle">
        Hover on a solution to preview, click in to see details and resources.
      </p>
      <img
        src="${ASSET_PATH}/illustrations/hover-click.svg"
        alt="Illustration of hover and click for the petals of the viz"
        class="hover-image"
      />
    </div>
  `;

  function innerContentHovered() {
    return html`
      <div
        class="innerContent innerContent__hovered"
        xmlns="http://www.w3.org/1999/xhtml"
      >
        <img
          src="${ASSET_PATH}/illustrations/${hoveredItem["Category"]}.svg"
          alt="${hoveredItem["Category"]}"
          class="category-image"
        />
        <div class="category-pill" data-category="${hoveredItem["Category"]}">
          ${hoveredItem["Category"]}
        </div>
        <p class="solution-title">${hoveredItem["Solution abbreviation"]}</p>
        <p class="solution-subtitle">${hoveredItem["Solution"]}</p>
      </div>
    `;
  }

  const innerContent = hoveredItem
    ? innerContentHovered()
    : innerContentDefault;

  return html`
    <div ref=${vizRef}>
      <svg
        viewBox="0 0 ${squareSize} ${squareSize}"
        xmlns="http://www.w3.org/2000/svg"
        transform="scale(${isInView ? 1 : 0.5})"
        class="${isInView ? "in-view" : "not-in-view"}"
      >
        <g transform="translate(${squareSize / 2}, ${squareSize / 2})">
          <g class="categories">${categoryGroups}</g>
          <g class="petalGroups">
            ${petalGroups.map((petalGroup) => {
              return html` <g class="petalGroup">${petalGroup.petals}</g> `;
            })}
          </g>
          <g class="innerContent">
            <g transform="translate(-${innerRadius - 20},-${innerRadius - 20})">
              <foreignObject
                x="0"
                y="0"
                width="${innerRadius * 2 - 40}"
                height="${innerRadius * 2 - 40}"
              >
                ${innerContent}
              </foreignObject>
            </g>
          </g>
        </g>
      </svg>
    </div>
  `;
}

function Page() {
  const lorem =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla ac";

  return html`
    <div class="page">
      <h1>Page</h1>
      ${Array(28).fill(html`<p>${lorem}</p>`)} ${html`<${Viz} />`}
      ${Array(28).fill(html`<p>${lorem}</p>`)}
    </div>
  `;
}

const vizContainerElement = document.getElementById("solution-viz");
if (vizContainerElement) {
  render(html`<${Viz} />`, vizContainerElement);
} else {
  console.error(
    "Could not find container element for solution viz with id 'solution-viz'"
  );
}
