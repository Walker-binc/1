(async function () {
  const storageKey = "sales-card-system.people";
  const sectionEditor = document.getElementById("sectionEditor");
  const addSectionBtn = document.getElementById("addSectionBtn");
  const selectedCategoryPreview = document.getElementById("selectedCategoryPreview");
  const allCategoryPreview = document.getElementById("allCategoryPreview");
  const people = normalisePeople(await loadPeople());
  let activeCategory = "All Products";

  async function loadPeople() {
    const fallback = window.DEFAULT_SALES || [];
    try {
      const response = await fetch("./api/people", { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch {
      // Static preview fallback.
    }
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  }

  async function savePeople(next) {
    try {
      const response = await fetch("./api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (response.ok) return;
    } catch {
      // Static preview fallback.
    }
    localStorage.setItem(storageKey, JSON.stringify(next, null, 2));
  }

  function normalisePeople(list) {
    return list.map((person) => ({
      slug: person.slug || "",
      name: person.name || "",
      title: person.title || "",
      phone: person.phone || "",
      email: person.email || "",
      region: person.region || "",
      photo: person.photo || "./assets/people/amelia-clarke.svg",
      bio: person.bio || "",
      detailHeadline: person.detailHeadline || "",
      categories: normaliseCategories(person.categories),
      sections: normaliseSections(person.sections, person)
    }));
  }

  function normaliseCategories(categories) {
    if (!Array.isArray(categories)) return [];
    return categories
      .map((category) => String(category || "").trim())
      .filter(Boolean);
  }

  function normaliseSections(sections, person) {
    if (Array.isArray(sections) && sections.length) {
      return sections.map((section, index) => ({
        id: section.id || `section-${index + 1}`,
        title: section.title || "Section Title",
        body: section.body || ""
      }));
    }

    return [
      { id: "about", title: "About", body: person.bio || "" }
    ];
  }

  function profileHref(person) {
    if (location.protocol === "file:") {
      return `./card.html?id=${encodeURIComponent(person.slug)}`;
    }
    return `./${encodeURIComponent(person.slug)}`;
  }

  function qrImageSrc(person) {
    if (location.protocol === "file:") {
      return "";
    }
    return `./api/qr/${encodeURIComponent(person.slug)}.svg`;
  }

  function telHref(phone) {
    return `tel:${String(phone).replace(/[^\d+]/g, "")}`;
  }

  function mailHref(email) {
    return `mailto:${email}`;
  }

  function resolveSlugForProfile() {
    const querySlug = new URLSearchParams(location.search).get("id");
    if (querySlug) return querySlug;
    const parts = location.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || people[0]?.slug;
  }

  function getPerson(slug) {
    return people.find((item) => item.slug === slug);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function renderSectionCards(sections) {
    return sections.map((section) => `
      <article class="profile-module">
        <h3>${escapeHtml(section.title)}</h3>
        <p>${escapeHtml(section.body)}</p>
      </article>
    `).join("");
  }

  function getAllCategories() {
    const categories = new Set(["All Products"]);
    people.forEach((person) => {
      person.categories.forEach((category) => categories.add(category));
    });
    return [...categories];
  }

  function buildCard(person) {
    const tags = person.categories.length
      ? person.categories.map((category) => `<span class="sales-tag">${escapeHtml(category)}</span>`).join("")
      : `<span class="sales-tag muted">General Enquiries</span>`;
    const qr = qrImageSrc(person)
      ? `<img class="person-qr" src="${qrImageSrc(person)}" alt="QR code for ${escapeHtml(person.name)}" />`
      : `<div class="person-qr placeholder">Open</div>`;

    return `
      <article class="sales-card">
        <a class="sales-card-link" href="${profileHref(person)}">
          <div class="sales-card-media">
            <img src="${person.photo}" alt="${escapeHtml(person.name)} portrait" />
          </div>
          <div class="sales-card-body">
            <p class="sales-region">${escapeHtml(person.region || "Sales Team")}</p>
            <h3>${escapeHtml(person.name)}</h3>
            <p class="sales-role">${escapeHtml(person.title)}</p>
            <div class="sales-tags">${tags}</div>
          </div>
        </a>
        <div class="sales-card-qr-row">
          <a class="sales-qr-link" href="${profileHref(person)}">${qr}</a>
          <p>Scan or click to open this sales profile.</p>
        </div>
      </article>
    `;
  }

  function renderHomeGrid() {
    const grid = document.getElementById("teamGrid");
    if (!grid) return;
    const filtered = activeCategory === "All Products"
      ? people
      : people.filter((person) => person.categories.includes(activeCategory));
    grid.innerHTML = filtered.length
      ? filtered.map(buildCard).join("")
      : `<div class="empty-state"><h3>No sales profiles in this product category yet.</h3><p>Use the admin page to assign categories to sales reps and they will appear here.</p></div>`;
  }

  function initHome() {
    const grid = document.getElementById("teamGrid");
    const filters = document.getElementById("categoryFilters");
    if (!grid || !filters) return;

    const renderFilters = () => {
      filters.innerHTML = getAllCategories().map((category) => `
        <button type="button" class="category-chip ${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `).join("");
    };

    filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-category]");
      if (!button) return;
      activeCategory = button.dataset.category;
      renderFilters();
      renderHomeGrid();
    });

    renderFilters();
    renderHomeGrid();
  }

  function initProfile() {
    const target = document.getElementById("profileCard");
    if (!target) return;
    const person = getPerson(resolveSlugForProfile());
    if (!person) {
      target.innerHTML = `<h1>Profile not found</h1><p>Please check the QR code link or contact an administrator.</p><a class="primary-btn" href="./">Back to Team</a>`;
      return;
    }

    const lead = person.detailHeadline || person.bio || "";
    const categoryTags = person.categories.length
      ? person.categories.map((category) => `<span class="profile-tag">${escapeHtml(category)}</span>`).join("")
      : `<span class="profile-tag">General Enquiries</span>`;
    document.title = `${person.name} · Sales Digital Business Card`;
    target.innerHTML = `
      <section class="profile-layout">
        <aside class="profile-sidebar">
          <div class="profile-portrait-panel">
            <img class="profile-photo" src="${person.photo}" alt="${person.name} portrait" />
          </div>
          <div class="profile-identity-panel">
            <img class="profile-logo" src="./assets/logo.svg" alt="Company Logo" />
            <p class="eyebrow">${escapeHtml(person.region || "Sales")}</p>
            <h1>${escapeHtml(person.name)}</h1>
            <h2>${escapeHtml(person.title)}</h2>
            <div class="profile-tag-row">${categoryTags}</div>
            <p class="detail-lead-inline">${escapeHtml(lead)}</p>
            <div class="contact-row">
              <a class="primary-btn" href="${telHref(person.phone)}">Call</a>
              <a class="secondary-btn" href="${mailHref(person.email)}">Email</a>
            </div>
            <dl class="contact-list">
              <div><dt>Phone</dt><dd><a href="${telHref(person.phone)}">${escapeHtml(person.phone)}</a></dd></div>
              <div><dt>Email</dt><dd><a href="${mailHref(person.email)}">${escapeHtml(person.email)}</a></dd></div>
            </dl>
          </div>
        </aside>
        <section class="profile-main">
          <div class="profile-main-head">
            <p class="eyebrow">Profile Overview</p>
            <h3>Professional Snapshot</h3>
            <p>${escapeHtml(person.bio || lead)}</p>
          </div>
          <div class="profile-modules">
            ${renderSectionCards(person.sections)}
          </div>
        </section>
      </section>
    `;
  }

  function buildSectionEditorItem(section, index, total) {
    return `
      <article class="section-item" data-index="${index}">
        <div class="section-item-head">
          <strong>Section ${index + 1}</strong>
          <div class="section-item-actions">
            <button type="button" class="section-move" data-direction="-1" ${index === 0 ? "disabled" : ""}>Up</button>
            <button type="button" class="section-move" data-direction="1" ${index === total - 1 ? "disabled" : ""}>Down</button>
            <button type="button" class="section-delete">Delete</button>
          </div>
        </div>
        <label>Section Title<input name="sectionTitle" value="${escapeHtml(section.title)}" /></label>
        <label>Section Content<textarea name="sectionBody" rows="5">${escapeHtml(section.body)}</textarea></label>
      </article>
    `;
  }

  function renderSectionEditor(sections) {
    if (!sectionEditor) return;
    sectionEditor.innerHTML = sections.map((section, index) => buildSectionEditorItem(section, index, sections.length)).join("");
  }

  function readSectionsFromEditor() {
    if (!sectionEditor) return [];
    return [...sectionEditor.querySelectorAll(".section-item")].map((item, index) => ({
      id: item.dataset.id || `section-${index + 1}`,
      title: item.querySelector('[name="sectionTitle"]').value.trim() || `Section ${index + 1}`,
      body: item.querySelector('[name="sectionBody"]').value.trim()
    })).filter((section) => section.title || section.body);
  }

  function parseCategoriesInput(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function previewCategoryChips(list, emptyLabel) {
    if (!list.length) return `<span class="sales-tag muted">${escapeHtml(emptyLabel)}</span>`;
    return list.map((category) => `<span class="sales-tag">${escapeHtml(category)}</span>`).join("");
  }

  function initAdmin() {
    const list = document.getElementById("adminList");
    const form = document.getElementById("personForm");
    if (!list || !form) return;
    let selectedSlug = people[0]?.slug || "";

    const renderList = () => {
      list.innerHTML = people.map((person) => `
        <button type="button" class="${person.slug === selectedSlug ? "active" : ""}" data-slug="${person.slug}">
          <strong>${person.name}</strong><span>${person.title}</span>
        </button>
      `).join("");
    };

    const fillForm = () => {
      const person = getPerson(selectedSlug) || people[0];
      if (!person) return;
      Object.entries(person).forEach(([key, value]) => {
        if (key === "sections" || key === "categories") return;
        if (form.elements[key]) form.elements[key].value = value || "";
      });
      if (form.elements.categoriesCsv) {
        form.elements.categoriesCsv.value = (person.categories || []).join(", ");
      }
      renderSectionEditor(person.sections || []);
      renderCategoryPreview();
    };

    const renderCategoryPreview = () => {
      const currentCategories = parseCategoriesInput(form.elements.categoriesCsv?.value || "");
      if (selectedCategoryPreview) {
        selectedCategoryPreview.innerHTML = previewCategoryChips(currentCategories, "No categories yet");
      }
      if (allCategoryPreview) {
        const merged = new Set();
        people.forEach((person) => {
          person.categories.forEach((category) => merged.add(category));
        });
        currentCategories.forEach((category) => merged.add(category));
        allCategoryPreview.innerHTML = previewCategoryChips([...merged], "No homepage categories yet");
      }
    };

    list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-slug]");
      if (!button) return;
      selectedSlug = button.dataset.slug;
      renderList();
      fillForm();
    });

    addSectionBtn?.addEventListener("click", () => {
      const sections = readSectionsFromEditor();
      sections.push({
        id: `section-${Date.now()}`,
        title: "New Section",
        body: ""
      });
      renderSectionEditor(sections);
    });

    form.elements.categoriesCsv?.addEventListener("input", () => {
      renderCategoryPreview();
    });

    sectionEditor?.addEventListener("click", (event) => {
      const sectionItem = event.target.closest(".section-item");
      if (!sectionItem) return;
      const sections = readSectionsFromEditor();
      const index = Number(sectionItem.dataset.index);

      if (event.target.closest(".section-delete")) {
        sections.splice(index, 1);
        renderSectionEditor(sections);
        return;
      }

      const moveBtn = event.target.closest(".section-move");
      if (moveBtn) {
        const direction = Number(moveBtn.dataset.direction);
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= sections.length) return;
        [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
        renderSectionEditor(sections);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      data.slug = data.slug.trim().replace(/\s+/g, "-").toLowerCase();
      data.categories = parseCategoriesInput(data.categoriesCsv);
      delete data.categoriesCsv;
      data.sections = readSectionsFromEditor();
      const index = people.findIndex((item) => item.slug === selectedSlug);
      if (index >= 0) {
        people[index] = normalisePeople([data])[0];
      }
      selectedSlug = data.slug;
      await savePeople(people);
      renderList();
      fillForm();
    });

    document.getElementById("addPersonBtn").addEventListener("click", async () => {
      const person = {
        slug: `sales-${Date.now()}`,
        name: "New Sales Rep",
        title: "Sales Consultant",
        phone: "",
        email: "",
        region: "",
        photo: "./assets/people/amelia-clarke.svg",
        bio: "",
        detailHeadline: "",
        categories: ["New Category"],
        sections: [
          { id: "about", title: "About", body: "" }
        ]
      };
      people.push(person);
      selectedSlug = person.slug;
      await savePeople(people);
      renderList();
      fillForm();
    });

    document.getElementById("deleteBtn").addEventListener("click", async () => {
      const index = people.findIndex((item) => item.slug === selectedSlug);
      if (index >= 0 && people.length > 1) {
        people.splice(index, 1);
        selectedSlug = people[0].slug;
        await savePeople(people);
        renderList();
        fillForm();
      }
    });

    document.getElementById("exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(people, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sales-data.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      localStorage.removeItem(storageKey);
      location.reload();
    });

    renderList();
    fillForm();
  }

  initHome();
  initProfile();
  initAdmin();
})();
