package io.github.danicano77.afinador;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Embolcall mínim de la PWA. Carrega sempre la versió publicada, així que
 * l'aplicació s'actualitza sola i també funciona offline gràcies al service
 * worker del lloc.
 */
public class MainActivity extends Activity {
    private static final String APP_URL = "https://danicano77.github.io/tuner/";
    private static final int MIC_REQUEST = 1;

    private WebView webView;
    private boolean pageRequested = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // El micròfon és l'únic recurs que demana l'afinador.
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
            // Carreguem la pàgina quan l'usuari respon, perquè la primera
            // petició de micròfon no arribi abans que existeixi el permís.
            requestPermissions(
                    new String[] {Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
        } else {
            loadApp(savedInstanceState);
        }
    }

    private void loadApp(Bundle state) {
        if (pageRequested) return;
        pageRequested = true;
        if (state == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(state);
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MIC_REQUEST) {
            loadApp(null);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
