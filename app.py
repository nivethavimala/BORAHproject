import os
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_file, send_from_directory

from backend.extensions import cors, db_orm, jwt_manager
from backend.migrate_legacy import migrate_legacy_data
from backend.paths import get_database_uri
from backend.routes.auth_routes import auth_bp
from backend.routes.exports_routes import exports_bp
from backend.routes.personal_routes import personal_bp
from backend.routes.reports_routes import reports_bp
from backend.routes.workspace_routes import workspace_bp
from backend.security import JWT_SECRET

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
MSC_DOCS_DIR = os.path.join(BASE_DIR, 'msc_docs')
PORT = int(os.environ.get('PORT', '3000'))


def create_app() -> Flask:
    application = Flask(
        __name__,
        template_folder='templates',
        static_folder='static',
        static_url_path='/static',
    )
    application.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
    application.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()
    application.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    application.config['JWT_SECRET_KEY'] = JWT_SECRET

    db_orm.init_app(application)
    cors.init_app(application, resources={r'/api/*': {'origins': '*'}})
    jwt_manager.init_app(application)

    application.register_blueprint(auth_bp)
    application.register_blueprint(workspace_bp)
    application.register_blueprint(reports_bp)
    application.register_blueprint(personal_bp)
    application.register_blueprint(exports_bp)

    with application.app_context():
        db_orm.create_all()
        migrate_legacy_data()

    return application


app = create_app()


# ==========================================
# RESEARCH & PRESENTATION DOCUMENT ROUTES
# ==========================================


def _resolve_doc_path(filename: str) -> str:
    primary = os.path.join(PUBLIC_DIR, filename)
    backup = os.path.join(MSC_DOCS_DIR, filename)
    return primary if os.path.exists(primary) else backup


@app.get('/api/download/paper-docx')
def download_paper_docx() -> Any:
    target = _resolve_doc_path('BORAH_Research_Paper.docx')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download Word document.'}), 404
    return send_file(target, as_attachment=True, download_name='BORAH_Research_Paper.docx')


@app.get('/api/download/paper-tex')
def download_paper_tex() -> Any:
    target = _resolve_doc_path('BORAH_Research_Paper.tex')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download LaTeX source.'}), 404
    return send_file(target, as_attachment=True, download_name='BORAH_Research_Paper.tex')


@app.get('/api/download/paper-pdf')
def download_paper_pdf() -> Any:
    target = _resolve_doc_path('BORAH_Research_Paper.pdf')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download PDF document.'}), 404
    return send_file(target, as_attachment=True, download_name='BORAH_Research_Paper.pdf', mimetype='application/pdf')


@app.get('/api/download/presentation-pdf')
def download_presentation_pdf() -> Any:
    target = _resolve_doc_path('BORAH_Project_Presentation.pdf')
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'Could not download presentation PDF.'}), 404
    return send_file(
        target,
        as_attachment=True,
        download_name='BORAH_Project_Presentation.pdf',
        mimetype='application/pdf',
    )


@app.get('/BORAH_Research_Paper.pdf')
@app.get('/BORAH_Research_Paper.docx')
@app.get('/BORAH_Research_Paper.tex')
@app.get('/BORAH_Project_Presentation.pdf')
def serve_public_research_doc() -> Any:
    filename = request.path.lstrip('/')
    target = _resolve_doc_path(filename)
    if not os.path.exists(target):
        return jsonify({'success': False, 'message': 'File not found.'}), 404
    mimetype = 'application/pdf' if filename.endswith('.pdf') else None
    return send_file(target, mimetype=mimetype)


@app.get('/assets/<path:filename>')
def serve_public_assets(filename: str) -> Any:
    assets_dir = os.path.join(PUBLIC_DIR, 'assets')
    return send_from_directory(assets_dir, filename)


# ==========================================
# HEALTH & SPA ENTRYPOINT
# ==========================================


@app.get('/healthz')
@app.get('/api/health')
def health_check() -> Any:
    return jsonify({'status': 'ok', 'service': 'borah'}), 200


@app.get('/')
def index() -> Any:
    return render_template('index.html')


if __name__ == '__main__':
    print(f'BORAH Python/Flask server listening on http://0.0.0.0:{PORT}', flush=True)
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
