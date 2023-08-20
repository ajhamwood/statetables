var app = new $.Machine({
      flipflop_max: 3,
      input_max: 3,
      output_max: 3,
      inputChar: "U",
      outputChar: "Z",
      encoding: null
    });

// Generates an array of all permutations of the given array
const comb = ar => {
        const comb_ = (x, ar) => ar.length === 0 ? [[x]] : comb_(ar.shift(), ar).flatMap(as =>
                as.map((_, i) => as.slice(0, i).concat([x]).concat(as.slice(i)))
                  .concat([as.concat([x])]));
        return ar.length === 0 ? [[]] : comb_(ar.shift(), ar) };

// Events
$.targets({
  load () { app.emit("init") },

  app: {

    init () {
      const selNames = ["flipflop", "input", "output"];
      for (let sel of selNames) {
        const selSel = `#${sel}s`,
              selVal = Math.max(Math.min(localStorage.getItem(sel + "_max"), this[sel + "_max"]));
        localStorage.setItem(sel + "_max", selVal);
        for (let i = 0; i <= this[sel + "_max"]; i++) {
          const opt = $.load("num-option", selSel)[0][0];
          opt.label = opt.value = i;
        }
        $(selSel).value = selVal
      }

      $("main").style.setProperty("--expInputs", 2 ** localStorage.getItem("input_max"));
      $("main").style.setProperty("--outputs", localStorage.getItem("output_max"));
      $("#gen-encodings").setAttribute("disabled", "")
    },

    createTableHeadings(targetSel) {
      const [ flipflopSel, inputSel, outputSel ] = $.all("#create-grid > select");
      $(targetSel).replaceChildren();
      $.load("table-headings", targetSel);
      if (outputSel.value == 0) $(".outputs-head").remove();
      if (/result$/.test(targetSel)) $.load("encoding-cur-head", targetSel);

      for (let n = 2 ** parseInt(inputSel.value) - 1; n >= 0; n--) {
        let phstr = "";
        for (let nv = parseInt(inputSel.value) - 1; nv >= 0; nv--)
          phstr += this.inputChar + (n & 1 << nv ? "\u0305" : "") + String.fromCodePoint(0x2080 + nv);
        $.load("next-label", targetSel)[0][0].innerText = phstr;
      }
      for (let o = parseInt(outputSel.value) - 1; o >= 0; o--)
        $.load("output-label", targetSel)[0][0].innerText = this.outputChar + String.fromCodePoint(0x2080 + o);
    },

    // Update the state table with the selected encoding
    calculateEncoding() {
      this.encoding = $("#table-encoding").value.split(",").filter(Boolean).map(s => parseInt(s));
      const perm = [0].concat(this.encoding),
            invertPerm = perm.reduce((ar, n, i) => ar.with(n, i), Array(perm.length)),
            [ flipflops, inputs, outputs ] = $.all("#create-grid > select").map(el => parseInt(el.value)),
            toBin = num => num.toString(2).padStart(flipflops, "0"),
            nextStates = $.all(".next-field").map(el => parseInt(el.value)),
            outputValues = $.all(".output-field").map(el => parseInt(el.value));
      $.all("#table-result > .current-label").forEach((el, i) => el.innerText = "S" + invertPerm[i]);
      $.all(".next-cell").forEach((el, i) =>
        el.innerText = toBin(perm[
          nextStates[2 ** inputs * invertPerm[Math.floor(i / (2 ** inputs))] + i % (2 ** inputs)]
        ]));
      $.all(".output-cell").forEach((el, i) =>
        el.innerText = outputValues[outputs * invertPerm[Math.floor(i / outputs)] + i % outputs])
    }

  }
});

// Behaviour
$.queries({

  "form": {
    submit (e) { e.preventDefault() }
  },

  // Change the size of the state machine
  "#create-grid > select": {
    change () {
      $("#table-spec").replaceChildren();
      $("#table-result").replaceChildren();
      $("#table-encoding").replaceChildren();
      $.load("encoding-option", "#table-encoding")[0][0].setAttribute("disabled", "");
      $("#gen-encodings").setAttribute("disabled", "");
      localStorage.setItem(this.id.replace(/s$/, "_max"), this.selectedIndex);
      if (this.id === "inputs") $("main").style.setProperty("--expInputs", 2 ** this.selectedIndex);
      else if (this.id === "outputs") $("main").style.setProperty("--outputs", this.selectedIndex)
    }
  },

  // Generate a table in which to define the state machine
  "#gen-table": {
    click () {
      app.emit("createTableHeadings", "#table-spec")
      const [ flipflopSel, inputSel, outputSel ] = $.all("#create-grid > select");

      for (let s = 0; s < 2 ** parseInt(flipflopSel.value); s++) {
        $.load("current-label", "#table-spec")[0][0].innerText = "S" + s;
        for (let i = 2 ** parseInt(inputSel.value) - 1; i >= 0; i--)
          $.load("next-field", "#table-spec")[0][0].max = 2 ** parseInt(flipflopSel.value) - 1;
        for (let z = parseInt(outputSel.value) - 1; z >= 0; z--)
          $.load("output-field", "#table-spec")
      }

      $.queries({
        input: {
          change () { $("#table-result").replaceChildren() }
        }
      }, $("#table-spec"));
      $("#table-encoding").replaceChildren();
      $("#gen-encodings").removeAttribute("disabled");

      // Make all encodings available
      comb(Array(2 ** parseInt(flipflopSel.value) - 1).fill(0).map((_, i) => i + 1)).forEach(ar => {
        const encOpt = $.load("encoding-option", "#table-encoding")[0][0];
        encOpt.value = ar;
        encOpt.innerText = ar.reduce(
          (acc, n, i) => `${acc}, S${i + 1}=${n.toString(2).padStart(flipflopSel.value, "0")}`,
          "S0=" + ("0".repeat(parseInt(flipflopSel.value)) || "Ø"));
      });
      app.encoding = $("#table-encoding").value.split(",").filter(Boolean).map(s => parseInt(s));
    }
  },

  // Initialise the state table for the canonical binary encoding
  "#gen-encodings": {
    click () {
      if (!Array.from(this.closest("form")).every(field => field.validity.valid)) return;
      app.emit("createTableHeadings", "#table-result");
      const [ flipflopSel, inputSel, outputSel ] = $.all("#create-grid > select");
      for (let s = 0; s < 2 ** parseInt(flipflopSel.value); s++) {
        $.load("current-label", "#table-result")[0][0].innerText =
          "S" + (app.encoding.findIndex(x => x == 1) + 1);
        $.load("current-cell", "#table-result")[0][0].innerText =
          s.toString(2).padStart(flipflopSel.value, "0");
        for (let i = 2 ** parseInt(inputSel.value) - 1; i >= 0; i--)
          $.load("next-cell", "#table-result");
        for (let z = parseInt(outputSel.value) - 1; z >= 0; z--)
          $.load("output-cell", "#table-result")
      }
      app.emit("calculateEncoding")
    }
  },

  "#table-encoding": {
    change () { app.emit("calculateEncoding") }
  }
})