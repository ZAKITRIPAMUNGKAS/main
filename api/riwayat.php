<?php
/**
 * api/riwayat.php
 * ----------------------------------------------------------------
 * Menangani upload & penyimpanan foto "Riwayat Pekerjaan" secara
 * permanen di server (bukan cuma tampil di browser pengunjung).
 *
 * GET  -> kirim daftar foto yang sudah ada (JSON)
 * POST action=upload         -> upload foto baru
 * POST action=update_caption -> ubah keterangan foto
 * POST action=delete         -> hapus foto
 * ----------------------------------------------------------------
 */

require __DIR__ . '/helpers.php';

$dataFile      = __DIR__ . '/../data/riwayat.json';
$uploadDir     = __DIR__ . '/../uploads/riwayat/';
$uploadUrlPath = 'uploads/riwayat/';

$allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
$maxSize    = 5 * 1024 * 1024; // 5MB

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $items = json_read($dataFile, []);
    usort($items, fn($a, $b) => ($b['id'] ?? 0) <=> ($a['id'] ?? 0));
    send_json(['ok' => true, 'items' => $items]);
}

if ($method === 'POST') {
    $action = $_POST['action'] ?? 'upload';

    // ---------- UPLOAD FOTO BARU ----------
    if ($action === 'upload') {
        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            send_json(['ok' => false, 'message' => 'File foto tidak ditemukan atau gagal diupload.'], 400);
        }
        $file = $_FILES['photo'];

        if ($file['size'] > $maxSize) {
            send_json(['ok' => false, 'message' => 'Ukuran file maksimal 5MB.'], 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true)) {
            send_json(['ok' => false, 'message' => 'Format file harus JPG, PNG, atau WEBP.'], 400);
        }

        // pastikan file yang dikirim benar-benar gambar, bukan file lain yang disamarkan
        $imgInfo = @getimagesize($file['tmp_name']);
        if ($imgInfo === false) {
            send_json(['ok' => false, 'message' => 'File yang diupload bukan gambar yang valid.'], 400);
        }

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $newName     = 'riwayat-' . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destination = $uploadDir . $newName;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            send_json(['ok' => false, 'message' => 'Gagal menyimpan file ke server. Periksa hak akses folder uploads/riwayat.'], 500);
        }

        $items   = json_read($dataFile, []);
        $newItem = [
            'id'      => (int) (microtime(true) * 1000),
            'image'   => $uploadUrlPath . $newName,
            'caption' => clean_text($_POST['caption'] ?? '', 200),
        ];
        $items[] = $newItem;
        json_write($dataFile, $items);

        send_json(['ok' => true, 'item' => $newItem]);
    }

    // ---------- UBAH KETERANGAN ----------
    if ($action === 'update_caption') {
        $id      = $_POST['id'] ?? '';
        $caption = clean_text($_POST['caption'] ?? '', 200);
        $items   = json_read($dataFile, []);
        $found   = false;

        foreach ($items as &$item) {
            if ((string) $item['id'] === (string) $id) {
                $item['caption'] = $caption;
                $found = true;
                break;
            }
        }
        unset($item);

        if (!$found) {
            send_json(['ok' => false, 'message' => 'Data tidak ditemukan.'], 404);
        }
        json_write($dataFile, $items);
        send_json(['ok' => true]);
    }

    // ---------- HAPUS FOTO ----------
    if ($action === 'delete') {
        $id        = $_POST['id'] ?? '';
        $items     = json_read($dataFile, []);
        $target    = null;
        $remaining = [];

        foreach ($items as $item) {
            if ((string) $item['id'] === (string) $id) {
                $target = $item;
            } else {
                $remaining[] = $item;
            }
        }

        if ($target === null) {
            send_json(['ok' => false, 'message' => 'Data tidak ditemukan.'], 404);
        }

        $filePath = __DIR__ . '/../' . $target['image'];
        if (is_file($filePath)) {
            @unlink($filePath);
        }

        json_write($dataFile, $remaining);
        send_json(['ok' => true]);
    }

    send_json(['ok' => false, 'message' => 'Aksi tidak dikenal.'], 400);
}

send_json(['ok' => false, 'message' => 'Metode tidak didukung.'], 405);
