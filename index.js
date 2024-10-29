const dropboxEl = document.querySelector("#dropbox");
const resultListEl = document.querySelector("#result-list");
const uploadFileEl = document.querySelector('input[type="file"]');
const containerEl = document.querySelector(".container[draggable]");

function handleAddFiles(files) {
  if (!files || !files.length) {
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("image")) {
      continue;
    }

    ExifReader.load(file).then((tags) => {
      appendResult(file, tags);
    });
  }
}

uploadFileEl.addEventListener("change", () => {
  handleAddFiles(uploadFileEl.files);
});

dropboxEl.addEventListener("click", () => {
  uploadFileEl.click();
});

dropboxEl.addEventListener("dragenter", (e) => {
  dropboxEl.classList.add("enter");
});

dropboxEl.addEventListener("dragleave", (e) => {
  dropboxEl.classList.remove("enter");
});

[containerEl, dropboxEl].forEach((el) =>
  el.addEventListener("dragover", (e) => {
    e.stopPropagation();
    e.preventDefault();
  })
);

[containerEl, dropboxEl].forEach((el) =>
  el.addEventListener("drop", (e) => {
    e.stopPropagation();
    e.preventDefault();
    dropboxEl.classList.remove("enter");
    handleAddFiles(e.dataTransfer.files);
  })
);

const paramsToHTMLStr = (params) => {
  if (!params) {
    return "";
  }

  const result = [];
  let tmp_acc = [];
  for (let str of params
    .trim()
    .split(",")
    .map((s) => s.trim())) {
    if (str.indexOf(": ") > -1) {
      if (tmp_acc.length > 0) {
        console.log(tmp_acc);
        result[result.length - 1] += ", " + tmp_acc.join(", ");
        tmp_acc = [];
      }
      result.push(str);
    } else {
      tmp_acc.push(str);
    }
  }

  const highlight_keys = [
    "Model:",
    "Sampler:",
    "Steps:",
    "CFG scale:",
    "VAE:",
    "Lora",
  ];

  result.sort((a, b) => {
    const ai = highlight_keys.some((k) => a.includes(k));
    const bi = highlight_keys.some((k) => b.includes(k));
    return bi - ai;
  });

  return result
    .map(
      (s) =>
        `<span class="tag ${
          highlight_keys.some((k) => s.includes(k)) ? "highlight" : ""
        }">${s.replace(/\\n/g, "<br/>")}</span>`
    )
    .join("\n");
};

const parseParams = (tags) => {
  const p = tags["parameters"];
  if (!p || !p["value"].trim()) {
    alert("Unknown file/No metadata found");
    return;
  }
  const v = p["value"];
  const ng_idx = v.indexOf("Negative prompt:");
  const param_idx = v.indexOf("Steps:");

  const prompt = v.slice(0, ng_idx).trim();
  const ng_prompt = v
    .slice(ng_idx, param_idx)
    .replace("Negative prompt:", "")
    .trim();

  const param_str = v.slice(param_idx).trim();

  return {
    prompt,
    "negative prompt": ng_prompt,
    parameters: param_str,
  };
};

const createResultItem = (dataURL, params) => {
  const div = document.createElement("div");
  div.classList.add("result-item");
  div.innerHTML = `
      <div class="img-container">
        <img src="${dataURL}" />
      </div>
      <div class="info">
        ${Object.keys(params)
          .map(
            (title) => `<div>
          <div class="title">${title}<span class="copy" data-title="${title}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-copy "><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"></path><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"></path></svg></span></div>
          <div class="content">${
            title === "parameters"
              ? paramsToHTMLStr(params[title])
              : params[title]
          }</div>
        </div>`
          )
          .join("\n")}
      </div>
    `;

  const copyBtn = div.querySelectorAll(".copy");

  copyBtn.forEach((el) =>
    el.addEventListener("click", () => {
      const title = el.getAttribute("data-title");
      navigator.clipboard
        .writeText(params[title])
        .then(() => {
          el.classList.add("success");
        })
        .catch(() => {
          el.classList.add("failed");
        });
    })
  );

  return div;
};

function appendResult(file, tags) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    const dataURL = reader.result;
    const node = createResultItem(dataURL, parseParams(tags));
    resultListEl.appendChild(node);
    node.scrollIntoView();
  };
}
