<?php
declare(strict_types=1);

mb_language('Japanese');
mb_internal_encoding('UTF-8');
date_default_timezone_set('Asia/Tokyo');

// Notification destination and server-side sender have separate roles.
const RECIPIENT_EMAIL = 'kyo19910402@icloud.com';
const SENDER_EMAIL = 'contact@nishino-kogyo.com';

function redirect_to(string $location): void
{
    header('Location: ' . $location, true, 303);
    exit;
}

function render_error(string $message, int $status = 400): void
{
    http_response_code($status);
    $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!doctype html><html lang="ja"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>送信エラー | 西野工業</title>';
    echo '<link rel="stylesheet" href="styles.css?v=20260730-13">';
    echo '<link rel="stylesheet" href="legal.css?v=20260730-1">';
    echo '</head><body class="legal-page"><main class="status-page">';
    echo '<div class="status-card"><p class="eyebrow">ERROR</p><h1>送信できませんでした</h1>';
    echo '<p>' . $safeMessage . '</p><a class="button button-gold" href="javascript:history.back()">入力画面へ戻る</a>';
    echo '</div></main></body></html>';
    exit;
}

function post_value(string $key, int $maxLength = 3000): string
{
    $value = $_POST[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }

    $value = str_replace("\0", '', trim($value));
    return mb_substr($value, 0, $maxLength, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    render_error('このページはフォームから送信してください。', 405);
}

$formType = post_value('form_type', 20);
if (!in_array($formType, ['contact', 'recruit'], true)) {
    render_error('フォームの種類を確認できませんでした。');
}

// Bot submissions fill this hidden field. Return success without sending.
if (post_value('website', 200) !== '') {
    redirect_to('thanks.html');
}

$name = post_value('name', 80);
$furigana = post_value('furigana', 120);
$tel = post_value('tel', 30);
$email = post_value('email', 254);
$message = post_value('message', 3000);
$consent = post_value('consent', 2);
$inquiryType = post_value('inquiry_type', 80);
$experience = post_value('experience', 40);
$position = post_value('position', 40);

if ($name === '' || $furigana === '' || $email === '') {
    render_error('必須項目を入力してください。');
}

if ($formType === 'contact' && $message === '') {
    render_error('お問い合わせ内容を入力してください。');
}

if ($formType === 'contact' && !in_array($inquiryType, [
    '工事のご相談・ご依頼',
    '採用について',
    '会社について',
    'その他',
], true)) {
    render_error('お問い合わせ種別を選択してください。');
}

if ($formType === 'recruit' && $tel === '') {
    render_error('電話番号を入力してください。');
}

if ($formType === 'recruit' && !in_array($position, [
    '鉄筋工',
    'トラック運転手',
], true)) {
    render_error('希望職種を選択してください。');
}

if ($formType === 'recruit' && !in_array($experience, [
    '',
    '未経験',
    '経験あり',
    '新卒',
], true)) {
    render_error('業界経験の選択内容を確認してください。');
}

if ($consent !== '1') {
    render_error('プライバシーポリシーへの同意が必要です。');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
    render_error('メールアドレスの形式を確認してください。');
}

$fromEmail = SENDER_EMAIL;

$labels = [];
if ($formType === 'contact') {
    $labels = [
        'フォーム' => '一般お問い合わせ',
        'お問い合わせ種別' => $inquiryType,
        '会社名' => post_value('company', 120),
        'お名前' => $name,
        'フリガナ' => $furigana,
        '電話番号' => $tel,
        'メールアドレス' => $email,
        'お問い合わせ内容' => $message,
    ];
    $subject = '【西野工業WEBサイト】お問い合わせが届きました';
} else {
    $labels = [
        'フォーム' => '求人応募・お問い合わせ',
        'お名前' => $name,
        'フリガナ' => $furigana,
        '電話番号' => $tel,
        'メールアドレス' => $email,
        '希望職種' => $position,
        '業界経験' => $experience,
        'ご質問・ご相談内容' => $message,
    ];
    $subject = '【西野工業WEBサイト】求人応募・お問い合わせが届きました';
}

$bodyLines = [
    '西野工業WEBサイトから送信がありました。',
    '',
];

foreach ($labels as $label => $value) {
    $bodyLines[] = '■ ' . $label;
    $bodyLines[] = $value !== '' ? $value : '（未入力）';
    $bodyLines[] = '';
}

$bodyLines[] = '送信日時：' . date('Y-m-d H:i:s');
$bodyLines[] = '送信元IP：' . ($_SERVER['REMOTE_ADDR'] ?? '不明');
$body = implode("\n", $bodyLines);

$headers = implode("\r\n", [
    'From: ' . mb_encode_mimeheader('西野工業WEBサイト', 'UTF-8') . ' <' . $fromEmail . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . PHP_VERSION,
]);

$sent = mb_send_mail(RECIPIENT_EMAIL, $subject, $body, $headers, '-f' . $fromEmail);
if (!$sent) {
    render_error('メール送信に失敗しました。時間をおいて再度お試しいただくか、お電話でお問い合わせください。', 500);
}

redirect_to('thanks.html?type=' . rawurlencode($formType));
