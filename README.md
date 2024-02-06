# Ecommerce-NodeJs
Small E-commerce App
**************************************************************************
-  User schema (userName, email, password (hashed), role, isVerfied, Adressed (user may have more that one address) ).
-  Product schema (productName, slug, priceAfterDiscount, finalPrice, image, category, stock)
-  category schema (categoryName, image, createdBy)
-  Coupon schema (couponCode, value, createdBy, updatedBy, deletedBy, expireIn)
-  Cart schema (userId, totalPrice, priceAfterDiscount, products)
**************************************************************************
UserAPI:
- Signup
- Singin and should verify
- Reset password
- Forget password
- Update user data (only admin can do it )
- Deactivate user
- **************************************************************************
ProductAPI:
- addProduct
- Update /Delete product (by admin or the one create it )
- Get all product with paginate
- Get specific product
- Get all product that in the same category
- **************************************************************************
Category:
- addCategory
- Update /Delete Category (by admin or the one create it )
- Get all category
- Get specific category
- **************************************************************************
Coupon:
- addCoupon
- Update /Delete coupon (by admin or the one create it )
- Get all coupons
- Apply coupon to product
- **************************************************************************
Cart:
- Create cart
- Update cart (by admin or the one create it )
- Apply coupon on cart if not applied to products
Create order cash on delivery
