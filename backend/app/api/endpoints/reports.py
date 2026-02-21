import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app import models
from app.api import deps

router = APIRouter()

@router.get("/csv/{report_type}")
def download_report_csv(
    report_type: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
):
    company_id = current_user.company_id
    
    stream = io.StringIO()
    writer = csv.writer(stream)
    
    if report_type == "products":
        writer.writerow(["Article No", "Name", "Product Price", "Sale Price", "In Hand Qty", "Status"])
        products = db.query(models.Product).filter(models.Product.company_id == company_id).all()
        for p in products:
            writer.writerow([p.article_no, p.name, p.product_price, p.sale_price, p.in_hand_qty, p.status])
            
    elif report_type == "suppliers":
        writer.writerow(["Supplier No", "Name", "Email", "Phone", "Status"])
        suppliers = db.query(models.Supplier).filter(models.Supplier.company_id == company_id).all()
        for s in suppliers:
            writer.writerow([s.supplier_no, s.name, s.email, s.phone, s.status])
            
    elif report_type == "transactions":
        writer.writerow(["Date", "Type", "Transaction ID", "Order No", "Debit", "Discount", "Product", "Qty", "Customer/Supplier"])
        transactions = db.query(models.Transaction).filter(models.Transaction.company_id == company_id).all()
        for t in transactions:
            writer.writerow([
                t.date.strftime("%Y-%m-%d %H:%M:%S") if t.date else "",
                t.type.value,
                t.transaction_id or "",
                t.order_no or "",
                t.debit,
                t.discount,
                t.product_name or "",
                t.quantity,
                t.customer_name or t.supplier_id or ""
            ])
    
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={report_type}_report.csv"
    return response

# Note: Excel/PDF could be implemented similarly using pandas/openpyxl and reportlab/weasyprint.
# We'll stick to CSV for this foundation to keep dependencies light, but the architecture handles it easily!
