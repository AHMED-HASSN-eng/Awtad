"use strict";

/* =========================================================================
   1) وضع داكن / فاتح
   - يُقرأ التفضيل المحفوظ من localStorage أولاً.
   - إن لم يوجد تفضيل محفوظ، يُستخدم إعداد النظام (prefers-color-scheme).
   - أي تغيير يُحفظ فورًا في localStorage ليبقى ثابتًا في الزيارات القادمة.
   ========================================================================= */
(function initTheme() {
  const root = document.documentElement;
  const toggleBtn = document.getElementById("theme-toggle");
  const STORAGE_KEY = "hvac-site-theme";

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }
})();

/* =========================================================================
   2) قائمة الجوال (الهامبرغر)
   ========================================================================= */
(function initMobileNav() {
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("main-nav");
  if (!hamburger || !nav) return;

  function closeNav() {
    nav.classList.remove("is-open");
    hamburger.classList.remove("is-open");
    hamburger.setAttribute("aria-expanded", "false");
  }

  hamburger.addEventListener("click", function () {
    const isOpen = nav.classList.toggle("is-open");
    hamburger.classList.toggle("is-open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });

  // إغلاق القائمة عند اختيار أي رابط داخلها (تجربة أفضل على الجوال)
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });
})();

/* =========================================================================
   3) عدّادات الإحصائيات المتحركة (تعمل عند دخول القسم لمجال الرؤية)
   ========================================================================= */
(function initCounters() {
  const counters = document.querySelectorAll("[data-count-to]");
  if (!counters.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-count-to"), 10) || 0;

    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString("en-US");
      return;
    }

    const duration = 1600;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out حتى لا يبدو العد آليًا بشكل مفرط
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(eased * target);
      el.textContent = value.toLocaleString("en-US");
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(function (el) {
    observer.observe(el);
  });
})();

/* =========================================================================
   4) نموذج طلب الصيانة — إرسال إلى Google Sheets عبر Google Apps Script
   =========================================================================
   خطوات الإعداد (راجع أيضًا ملف apps-script/README.md):
   1. أنشئ Google Sheet جديد وأضف صفًا أول بالعناوين:
      Timestamp | Service | Name | Phone | City | Notes
   2. من القائمة: Extensions > Apps Script.
   3. الصق كود Code.gs الموجود في مجلد apps-script/Code.gs.
   4. من Deploy > New deployment > اختر Web app.
        - Execute as: Me
        - Who has access: Anyone
   5. انسخ رابط الـ Web App الناتج، والصقه أدناه بدلًا من PASTE_YOUR_APPS_SCRIPT_URL_HERE.
   ========================================================================= */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydQS-Z63tgfJmsCdlV8ek9IXkfpO17XetuQ0iW0dLXcatgPfYzKTV0IRsb_51QhOCt/exec"; // ضع رابط نشر Apps Script هنا

(function initRequestForm() {
  const form = document.getElementById("request-form");
  if (!form) return;

  const submitBtn = document.getElementById("submit-btn");
  const statusBox = document.getElementById("form-status");

  const nameField = document.getElementById("name");
  const phoneField = document.getElementById("phone");

  // تحقق مبسّط من صيغة رقم جوال سعودي محلي: يبدأ بـ 05 ويتكون من 10 أرقام
  // (عدّل النمط إن كانت أرقام عملائك بصيغة مختلفة)
  const PHONE_PATTERN = /^0?5\d{8}$/;

  function setFieldError(field, hasError) {
    const wrapper = field.closest(".field");
    if (wrapper) {
      wrapper.classList.toggle("has-error", hasError);
    }
  }

  function validate() {
    let valid = true;

    const nameValid = nameField.value.trim().length >= 2;
    setFieldError(nameField, !nameValid);
    if (!nameValid) valid = false;

    const phoneDigits = phoneField.value.trim().replace(/[\s-]/g, "");
    const phoneValid = PHONE_PATTERN.test(phoneDigits);
    setFieldError(phoneField, !phoneValid);
    if (!phoneValid) valid = false;

    return valid;
  }

  function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = "form-status is-visible " + type;
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("is-loading", isLoading);
  }

  // إزالة رسالة الخطأ فور تصحيح الحقل
  [nameField, phoneField].forEach(function (field) {
    field.addEventListener("input", function () {
      setFieldError(field, false);
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    statusBox.classList.remove("is-visible");

    if (!validate()) {
      showStatus("الرجاء تصحيح الحقول المظللة قبل الإرسال.", "error");
      return;
    }

    if (SCRIPT_URL.indexOf("PASTE_YOUR_APPS_SCRIPT_URL_HERE") !== -1) {
      showStatus(
        "لم يتم ربط النموذج برابط Google Apps Script بعد. راجع تعليمات الإعداد في script.js.",
        "error"
      );
      return;
    }

    const payload = {
      service: document.getElementById("service").value,
      name: nameField.value.trim(),
      phone: phoneField.value.trim(),
      city: document.getElementById("city").value.trim(),
      notes: document.getElementById("notes").value.trim(),
    };

    setLoading(true);

    // ملاحظة مهمة عن CORS:
    // تطبيقات Apps Script المنشورة كـ Web App لا تُعيد ترويسات CORS التي
    // تسمح لمتصفح الصفحة بقراءة نص الاستجابة عند استخدام fetch العادي من
    // نطاق مختلف. الحل الشائع والموثوق هو الإرسال بوضع "no-cors": الطلب
    // يصل فعليًا للسكربت وتُنفَّذ عملية الإضافة في الشيت، لكن المتصفح يمنعنا
    // من قراءة رد النجاح/الفشل نفسه. لذلك نفترض النجاح إن لم يحدث خطأ شبكة
    // (مثل انقطاع الاتصال)، ونعرض رسالة نجاح متفائلة. إن أردت قراءة استجابة
    // حقيقية (نجاح/فشل من الخادم)، يلزم نشر الـ Web App بحيث يُعيد ترويسات
    // CORS بنفسه (Access-Control-Allow-Origin) أو استخدام حل JSONP بديل.
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function () {
        showStatus("تم إرسال طلبك بنجاح، سيتواصل معك فريقنا قريبًا.", "success");
        form.reset();
      })
      .catch(function () {
        showStatus("تعذّر إرسال الطلب. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.", "error");
      })
      .finally(function () {
        setLoading(false);
      });
  });
})();
