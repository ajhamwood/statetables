var app = new $.Machine({
      flipflop_max: 3,
      input_max: 3,
      output_max: 3,
      inputChar: "U",
      outputChar: "Z",
      flipflopInputChar: "D",
      flipflopOutputChar: "Q",
      encoding: null
    });

// Generates an array of all permutations of the given array
const comb = iota => iota.reduceRight((ars, x) => ars.flatMap(ar =>
        ar.map((_, i) => ar.slice(0, i).concat([x]).concat(ar.slice(i))).concat([ar.concat([x])])), [[]]);

// Events
$.targets({
  load () { app.emit("init") },

  app: {

    init () {
      const selNames = ["flipflop", "input", "output"];
      for (let sel of selNames) {
        localStorage.removeItem(sel + "_max");
        const selSel = `#${sel}s`,
              selVal = Math.max(Math.min(localStorage.getItem(sel + "s"), this[sel + "_max"]));
        localStorage.setItem(sel + "s", selVal);
        for (let i = 0; i <= this[sel + "_max"]; i++) {
          const opt = $.load("num-option", selSel)[0][0];
          opt.label = opt.value = i;
        }
        $(selSel).value = selVal
      }

      $("main").style.setProperty("--flipflops", localStorage.getItem("flipflops"));
      $("main").style.setProperty("--expInputs", 2 ** localStorage.getItem("inputs"));
      $("main").style.setProperty("--outputs", localStorage.getItem("outputs"));
      $("#gen-encodings").setAttribute("disabled", "")
    },

    createDisplayBy (str, fistr) {
      const choice = $.load("enc-view-choice", "#table-result > .next-head")[0][0];
      $.all("input", choice).forEach((el, i) => el.id = `choose-displayby-${i ? "ff" : ""}inputs`);
      $.all("label", choice).forEach((el, i) => {
        el.htmlFor = `choose-displayby-${i ? "ff" : ""}inputs`;
        el.innerText = i ? str : fistr
      });
      $.queries({
        "#table-result input[type=radio]": {
          change (e) { if (e.target.checked) {
            const displayby = this.id.match(/(ff)?inputs$/)[0],
                  table = $("#table-result");
            table.classList.contains("byinputs") ?
              table.classList.replace("byinputs", "byffinputs") :
              table.classList.replace("byffinputs", "byinputs")
            app.emit("calculateEncoding", displayby);
          } }
        }
      })
    },

    createTableHeadings (targetSel) {
      const [ flipflops, inputs, outputs ] = $.all("#create-grid > select").map(el => parseInt(el.value));
      $(targetSel).replaceChildren();
      const nextHead = $.load("table-headings", targetSel)[0][1];
      if (outputs === 0) $(".outputs-head").remove();

      if (/result$/.test(targetSel)) {
        $("#table-result").classList.replace("byffinputs", "byinputs");
        const encHead = $.load("encoding-cur-head", targetSel)[0][1];
        let fistr = "", fostr = "";
        for (let q = flipflops - 1; q >= 0; q--) {
          const sub = String.fromCodePoint(0x2080 + q);
          fistr += this.flipflopInputChar + sub;
          fostr += this.flipflopOutputChar + sub;
        }
        encHead.innerText += ` (${fostr})`;
        nextHead.innerText += " ";
        if (inputs === 0) nextHead.innerText += ` (${fistr})`;
        else if (inputs === 1) {
          const sub = String.fromCodePoint(0x2080);
          app.emit("createDisplayBy", `${this.inputChar}\u0305${sub}:${this.inputChar}${sub}`, fistr)
        } else if (inputs > 1) {
          let makestr = () => "";
          for (let d = inputs - 1; d >= 0; d--)
            makestr = (f => bool => f(bool) + this.inputChar
              + (bool ? "" : "\u0305") + String.fromCodePoint(0x2080 + d))(makestr);
          app.emit("createDisplayBy", `${makestr(false)}\u22ef${makestr(true)}`, fistr)
        }
      }

      for (let n = 2 ** inputs - 1; n >= 0; n--) {
        let phstr = "";
        for (let nv = inputs - 1; nv >= 0; nv--)
          phstr += this.inputChar + (n & 1 << nv ? "\u0305" : "") + String.fromCodePoint(0x2080 + nv);
        $.load("next-label-byinputs", targetSel)[0][0].innerText = phstr;
      }
      if (/result$/.test(targetSel)) for (let fi = flipflops - 1; fi >= 0; fi--)
        $.load("next-label-byffinputs", targetSel)[0][0].innerText = this.flipflopInputChar + String.fromCodePoint(0x2080 + fi);
      for (let o = outputs - 1; o >= 0; o--)
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
            outputValues = $.all(".output-field").map(el => parseInt(el.value)),
            truthTableByInput = nextStates.map((_, i) => toBin(perm[
              nextStates[2 ** inputs * invertPerm[Math.floor(i / (2 ** inputs))] + i % (2 ** inputs)]
            ])),
            iota = Array(flipflops).fill(0).map((_, i) => i);
      let truthTableByFFInput = [];
      for (let i = 0; i < 2 ** flipflops; i++) {
        const row = truthTableByInput.slice(i * 2 ** inputs, (i + 1) * 2 ** inputs);
        truthTableByFFInput = truthTableByFFInput.concat(iota.map(i => row.reduce((acc, str) => acc + str[i], "")))
      }

      $.all("#table-result > .current-label").forEach((el, i) => el.innerText = "S" + invertPerm[i]);
      $.all(".next-cell.byinputs").forEach((el, i) =>
        el.innerText = truthTableByInput[i]);
      $.all(".next-cell.byffinputs").forEach((el, i) =>
        el.innerText = truthTableByFFInput[i]);
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
      localStorage.setItem(this.id, this.selectedIndex);
      if (this.id === "flipflops") $("main").style.setProperty("--flipflops", this.selectedIndex)
      else if (this.id === "inputs") $("main").style.setProperty("--expInputs", 2 ** this.selectedIndex);
      else if (this.id === "outputs") $("main").style.setProperty("--outputs", this.selectedIndex)
    }
  },

  // Generate a table in which to define the state machine
  "#gen-table": {
    click () {
      app.emit("createTableHeadings", "#table-spec");
      const [ flipflops, inputs, outputs ] = $.all("#create-grid > select").map(el => parseInt(el.value));

      for (let s = 0; s < 2 ** flipflops; s++) {
        $.load("current-label", "#table-spec")[0][0].innerText = "S" + s;
        for (let i = 2 ** inputs - 1; i >= 0; i--)
          $.load("next-field", "#table-spec")[0][0].max = 2 ** flipflops - 1;
        for (let z = outputs - 1; z >= 0; z--)
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
      comb(Array(2 ** flipflops - 1).fill(0).map((_, i) => i + 1)).forEach(ar => {
        const encOpt = $.load("encoding-option", "#table-encoding")[0][0];
        encOpt.value = ar;
        encOpt.innerText = ar.reduce(
          (acc, n, i) => `${acc}, S${i + 1}=${n.toString(2).padStart(flipflops, "0")}`,
          "S0=" + ("0".repeat(flipflops) || "Ø"));
      });
      app.encoding = $("#table-encoding").value.split(",").filter(Boolean).map(s => parseInt(s));
    }
  },

  // Initialise the state table for the canonical binary encoding
  "#gen-encodings": {
    click () {
      if (!Array.from(this.closest("form")).every(field => field.validity.valid)) return;
      app.emit("createTableHeadings", "#table-result");
      const [ flipflops, inputs, outputs ] = $.all("#create-grid > select").map(el => parseInt(el.value));
      for (let s = 0; s < 2 ** flipflops; s++) {
        $.load("current-label", "#table-result")[0][0];
        $.load("current-cell", "#table-result")[0][0].innerText =
          s.toString(2).padStart(flipflops, "0");
        for (let i = 2 ** inputs - 1; i >= 0; i--)
          $.load("next-cell-byinputs", "#table-result");
        for (let f = flipflops - 1; f >= 0; f--)
          $.load("next-cell-byffinputs", "#table-result");
        for (let z = outputs - 1; z >= 0; z--)
          $.load("output-cell", "#table-result")
      }
      app.emit("calculateEncoding")
    }
  },

  "#table-encoding": {
    change () { app.emit("calculateEncoding") }
  }
})