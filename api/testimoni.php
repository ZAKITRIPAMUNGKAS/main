<?php
/**
 * api/testimoni.php
 * ----------------------------------------------------------------
 * Menangani penyimpanan testimoni pengunjung secara permanen di
 * server, supaya tampil untuk semua orang yang membuka halaman.
 *
 * GET  -> kirim daftar testimoni (JSON)
 * POST -> tambah testimoni baru
 * ----------------------------------------------------------------
 */

require __DIR__ . '/helpers.php';

$dataFile = __DIR__ . '/../data/testimoni.json';
$method   = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $items = json_read($dataFile, []);
    send_json(['ok' => true, 'items' => $items]);
}

if ($method === 'POST') {
    // honeypot sederhana: field ini disembunyikan dari pengunjung asli lewat CSS,
    // kalau terisi berarti kemungkinan besar bot spam
    if (!empty($_POST['website'])) {
        send_json(['ok' => true]); // pura-pura sukses supaya bot tidak mencoba lagi
    }

    $name    = clean_text($_POST['name'] ?? '', 80);
    $role    = clean_text($_POST['role'] ?? '', 100);
    $message = clean_text($_POST['message'] ?? '', 600);
    $rate    = (int) ($_POST['rate'] ?? 5);

    if ($name === '' || $message === '') {
        send_json(['ok' => false, 'message' => 'Nama dan komentar wajib diisi.'], 400);
    }
    if ($rate < 1 || $rate > 5) {
        $rate = 5;
    }

    $items   = json_read($dataFile, []);
    $newItem = [
        'id'      => (int) (microtime(true) * 1000),
        'name'    => $name,
        'role'    => $role,
        'rate'    => $rate,
        'message' => $message,
    ];
    $items[] = $newItem;
    json_write($dataFile, $items);

    send_json(['ok' => true, 'item' => $newItem]);
}

send_json(['ok' => false, 'message' => 'Metode tidak didukung.'], 405);
