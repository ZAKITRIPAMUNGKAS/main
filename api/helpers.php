<?php
/**
 * helpers.php
 * Fungsi bantu yang dipakai bersama oleh riwayat.php & testimoni.php
 */

function json_read($file, $default = []) {
    if (!file_exists($file)) return $default;
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : $default;
}

function json_write($file, $data) {
    return file_put_contents(
        $file,
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    ) !== false;
}

function send_json($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function clean_text($str, $maxLen = 500) {
    $str = trim(strip_tags((string) $str));
    if (function_exists('mb_substr')) {
        $str = mb_substr($str, 0, $maxLen);
    } else {
        $str = substr($str, 0, $maxLen);
    }
    return $str;
}
