/**
 * Code.gs — الوجهة الخلفية لنموذج طلب الصيانة
 * =============================================================================
 * تستقبل هذه الدالة طلبات POST من موقع الشركة وتضيف صفًا جديدًا في جوجل شيت.
 *
 * الأعمدة المتوقعة في الشيت (أضف هذا الصف كعناوين في السطر الأول تمامًا):
 *   Timestamp | Service | Name | Phone | City | Notes
 *
 * ملاحظة CORS: الموقع يرسل الطلب بوضع "no-cors"، لذلك القيمة التي تعيدها
 * هذه الدالة (JSON) لن تكون مقروءة من طرف الواجهة الأمامية، لكن الطلب
 * سيصل وتُنفَّذ عملية الإضافة في الشيت بشكل طبيعي. الكود هنا يعيد استجابة
 * صحيحة على أي حال، تحسبًا لتغيير طريقة الإرسال مستقبلًا (مثل نشر الويب
 * أب بإعدادات CORS مخصصة أو استخدام JSONP).
 */

function doPost(e) {
  try {
    var data = parseRequestData(e);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      new Date(),                    // Timestamp
      data.service || "",            // Service
      data.name || "",                // Name
      data.phone || "",               // Phone
      data.city || "",                // City
      data.notes || ""                // Notes
    ]);

    return buildJsonResponse({ status: "success" });
  } catch (err) {
    return buildJsonResponse({ status: "error", message: String(err) });
  }
}

/**
 * يقبل كلا الصيغتين: JSON (Content-Type: text/plain أو application/json كما
 * يرسلها fetch من المتصفح) أو بيانات نموذج تقليدية (application/x-www-form-urlencoded).
 */
function parseRequestData(e) {
  if (e.postData && e.postData.type && e.postData.type.indexOf("json") !== -1) {
    return JSON.parse(e.postData.contents);
  }
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // ليست JSON صالحة، نكمل لقراءة e.parameter أدناه
    }
  }
  return e.parameter || {};
}

function buildJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * دالة اختيارية: تسمح بفحص أن الويب أب يعمل عبر فتح الرابط في المتصفح مباشرة.
 */
function doGet() {
  return buildJsonResponse({ status: "ok", message: "الخدمة تعمل بشكل طبيعي." });
}
